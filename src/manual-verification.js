/* Read-only detection of the user-supplied CAPTCHA form. No background scheduler. */
(() => { 'use strict';
 const doc=document,host=window;
        // Match only the user-supplied verification form, never image contents or input values.
        function captchaRequired() {
            const seen = new Set();
            function visible(el, view) { if(!el || el.hidden || !el.getClientRects().length)return false;const s=view.getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.visibility!=='collapse'; }
            function visit(current, view, depth=0) {
                if(!current?.querySelectorAll||seen.has(current)||depth>7)return false;seen.add(current);
                for(const box of current.querySelectorAll('.yzmTips')){
                    if(box.closest('[data-xxt-codex-panel],.TiMu,.ans-videoquiz')||!visible(box,view))continue;
                    const form=box.closest('form'),input=box.querySelector('input#ucode.yzmInp[type="text"]'),image=box.querySelector('img#ccc');
                    if(form&&visible(input,view)&&visible(image,view)&&visible(form.querySelector('input.submit[type="submit"]'),view))return true;
                }
                for(const frame of current.querySelectorAll('iframe')){if(!visible(frame,view))continue;try{if(visit(frame.contentDocument,frame.contentWindow,depth+1))return true;}catch{}}
                return false;
            }
            return visit(doc,host);
        }

 globalThis.XxtManualVerification={requiresManual:captchaRequired};
})();
