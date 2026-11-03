/* Prefer the player's normal rate API; install an instance lock only after a rejected/reset rate. */
(() => {
    'use strict';
    function create({ enabled, setNormalRate, onStatus = () => {} }) {
        const entries = new Map();
        let blocked = new WeakSet();
        const active = media => media.isConnected && enabled();
        function release(entry) {
            clearTimeout(entry.timer);
            entry.media.removeEventListener('ratechange', entry.onRate, true);
            try {
                const d = entry.object.getOwnPropertyDescriptor(entry.media, 'playbackRate');
                if (entry.locked && d?.get === entry.getter && d?.set === entry.setter) {
                    if (entry.original) entry.object.defineProperty(entry.media, 'playbackRate', entry.original);
                    else delete entry.media.playbackRate;
                }
            } catch {}
            entries.delete(entry.media);
        }
        function actual(entry) { return entry.native.get.call(entry.media); }
        function status(entry, kind) {
            const value = actual(entry), key = `${kind}/${entry.target}/${value}`;
            if (key === entry.lastStatus) return;
            entry.lastStatus = key;
            onStatus({ kind, target: entry.target, actual: value });
        }
        function fail(entry, reason) {
            blocked.add(entry.media);
            let value = null; try { value = actual(entry); } catch {}
            release(entry);
            onStatus({ kind: 'failed', target: entry.target, actual: value, reason });
        }
        function writeLocked(entry) {
            if (!active(entry.media)) { release(entry); return; }
            try {
                const now = Date.now();
                if (now - entry.windowAt > 2000) { entry.windowAt = now; entry.writes = 0; }
                if (actual(entry) !== entry.target) {
                    if (++entry.writes > 6) { fail(entry, '播放器持续复位，已解除本媒体的强制锁'); return; }
                    entry.native.set.call(entry.media, entry.target);
                }
                if (actual(entry) !== entry.target) { fail(entry, '播放器拒绝倍速设置'); return; }
                status(entry, entry.locked ? 'locked' : 'fallback');
            } catch { fail(entry, '播放器不接受倍速写入，已解除强制锁'); }
        }
        function promote(entry) {
            // Capture/replace the instance property only after normal rate setting
            // has failed to stick. Working players keep their original descriptor.
            entry.original = entry.object.getOwnPropertyDescriptor(entry.media, 'playbackRate');
            entry.getter = () => actual(entry);
            entry.setter = value => {
                if (active(entry.media)) {
                    if (actual(entry) !== entry.target) entry.native.set.call(entry.media, entry.target);
                } else {
                    release(entry);
                    Reflect.set(entry.media, 'playbackRate', value);
                }
            };
            try {
                entry.object.defineProperty(entry.media, 'playbackRate', { configurable: true, enumerable: entry.original?.enumerable ?? true, get: entry.getter, set: entry.setter });
                entry.locked = true;
            } catch { entry.locked = false; }
            entry.mode = 'force';
            writeLocked(entry);
        }
        function schedule(entry) {
            if (entry.timer) return;
            entry.timer = setTimeout(() => {
                entry.timer = null;
                if (!active(entry.media)) { release(entry); return; }
                try {
                    if (actual(entry) === entry.target) { status(entry, entry.mode === 'normal' ? 'normal' : entry.locked ? 'locked' : 'fallback'); return; }
                    if (entry.mode === 'normal') promote(entry); else writeLocked(entry);
                } catch { fail(entry, '读取媒体速度失败，已解除强制锁'); }
            }, entry.mode === 'normal' ? 250 : 80);
        }
        function apply(media, rate) {
            if (!active(media)) return false;
            // 1x needs no force lock; returning to 1x restores the original setter.
            if (rate === 1 || blocked.has(media)) {
                const old = entries.get(media); if (old) release(old);
                setNormalRate(media, rate);
                return true;
            }
            let entry = entries.get(media);
            if (!entry) {
                const realm = media.ownerDocument.defaultView, object = realm.Object;
                const native = object.getOwnPropertyDescriptor(realm.HTMLMediaElement.prototype, 'playbackRate');
                if (!native?.get || !native?.set) {
                    setNormalRate(media, rate);
                    blocked.add(media);
                    onStatus({ kind: 'failed', target: rate, reason: '无法核对原生速度；已保留普通倍速路径' });
                    return true;
                }
                entry = { media, object, native, target: rate, mode: 'normal', locked: false, writes: 0, windowAt: Date.now() };
                entry.onRate = () => schedule(entry);
                media.addEventListener('ratechange', entry.onRate, true);
                entries.set(media, entry);
            }
            entry.target = rate;
            if (entry.mode === 'force') writeLocked(entry);
            else {
                // Prefer the existing Video.js/player setter and DOM semantics.
                // A 250ms check/event monitor escalates only if the rate is rejected/reset.
                setNormalRate(media, rate);
                try { if (actual(entry) === rate) status(entry, 'normal'); } catch {}
                schedule(entry);
            }
            return true;
        }
        function prune() { for (const entry of entries.values()) if (!active(entry.media)) release(entry); }
        function releaseAll(reset = false) {
            for (const entry of entries.values()) release(entry);
            if (reset) blocked = new WeakSet();
        }
        return { apply, prune, releaseAll };
    }
    globalThis.XxtForceRate = { create };
})();
