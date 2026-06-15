import {MODULE_PATH} from "./constants.mjs";

export default class ChatExporter {
    static exporter() {
        const orderHeader = document.createElement("h4");
        orderHeader.innerHTML = game.i18n.localize("MRKB.OrderFlag");

        const orderMsg = document.createElement("p");
        orderMsg.innerHTML = game.i18n.localize("MRKB.OrderFlagTooltip");

        const order = document.createElement("div");
        order.id = "export-as-order";
        order.append(orderHeader, orderMsg);

        const timestampHeader = document.createElement("h4");
        timestampHeader.innerHTML = game.i18n.localize("MRKB.Timestamp");

        const timestampMsg = document.createElement("p");
        timestampMsg.innerHTML = game.i18n.localize("MRKB.TimestampTooltip");

        const timestamp = document.createElement("div");
        timestamp.id = "export-as-timestamp";
        timestamp.append(timestampHeader, timestampMsg);

        const types = document.createElement("div");
        types.id = "export-types";
        types.append(order, timestamp);

        const includeCSS = document.createElement("input");
        includeCSS.type = "checkbox";
        includeCSS.name = "css";
        includeCSS.id = "include-css";

        const CSSH3 = document.createElement("h3");
        CSSH3.innerHTML = game.i18n.localize("MRKB.IncludeCSS");

        const CSSP = document.createElement("p");
        CSSP.innerHTML = game.i18n.localize("MRKB.IncludeCSSTooltip");

        const CSSDiv = document.createElement("div");
        CSSDiv.append(CSSH3, CSSP);

        const CSS = document.createElement("label");
        CSS.id = "export-css";
        CSS.htmlFor = "include-css";
        CSS.append(includeCSS, CSSDiv);

        // [CENEFORPG fork] 완전 독립형(오프라인): 모든 CSS 인라인 + 이미지 base64 내장
        const includeStandalone = document.createElement("input");
        includeStandalone.type = "checkbox";
        includeStandalone.name = "standalone";
        includeStandalone.id = "include-standalone";

        const standaloneH3 = document.createElement("h3");
        standaloneH3.innerHTML = "완전 독립형 (백업용)";

        const standaloneP = document.createElement("p");
        standaloneP.innerHTML = "CSS와 이미지를 파일 안에 모두 내장해, 서버가 꺼져 있어도 어디서나 열립니다. (파일 용량이 커지고 내보내기에 시간이 더 걸립니다)";

        const standaloneDiv = document.createElement("div");
        standaloneDiv.append(standaloneH3, standaloneP);

        const standalone = document.createElement("label");
        standalone.id = "export-standalone";
        standalone.htmlFor = "include-standalone";
        standalone.append(includeStandalone, standaloneDiv);

        // [CENEFORPG fork] 양피지 질감 배경 제거 옵션
        const includeNoBg = document.createElement("input");
        includeNoBg.type = "checkbox";
        includeNoBg.name = "nobg";
        includeNoBg.id = "include-nobg";

        const noBgH3 = document.createElement("h3");
        noBgH3.innerHTML = "양피지 배경 제외";

        const noBgP = document.createElement("p");
        noBgP.innerHTML = "양피지 질감 배경을 빼고 깔끔한 무지 배경으로 내보냅니다.";

        const noBgDiv = document.createElement("div");
        noBgDiv.append(noBgH3, noBgP);

        const noBg = document.createElement("label");
        noBg.id = "export-nobg";
        noBg.htmlFor = "include-nobg";
        noBg.append(includeNoBg, noBgDiv);

        const exporterForm = document.createElement("form");
        exporterForm.id = "chat-exporter";
        exporterForm.append(types, CSS, standalone, noBg);

        const exporter = new Dialog({
            title: `Chat Exporter`,
            content: exporterForm.outerHTML,
            buttons: {
                order: {
                    label: game.i18n.localize("MRKB.OrderFlag"),
                    callback: () => {
                        const form = document.querySelector("#chat-exporter");
                        this.exportHTML(true, form?.css?.checked, form?.standalone?.checked, form?.nobg?.checked)
                    }
                },
                timestamp: {
                    label: game.i18n.localize("MRKB.Timestamp"),
                    callback: () => {
                        const form = document.querySelector("#chat-exporter");
                        this.exportHTML(false, form?.css?.checked, form?.standalone?.checked, form?.nobg?.checked)
                    }
                },
                cancel: {
                    label: "취소"
                }
            },
            default: "cancel",
            close: () => {}
        }, {width: 400});

        exporter.render(true);
    }
    static realignTime(timestamp) {
        const date = new Date(timestamp);
        return {
            ye : String(date.getFullYear()).slice(2, 4),
            mo : String(date.getMonth() + 1).padStart(2, '0'),
            da : String(date.getDate()).padStart(2, '0'),
            ho : String(date.getHours()).padStart(2, '0'),
            mi : String(date.getMinutes()).padStart(2, '0'),
            se : String(date.getSeconds()).padStart(2, '0')
        }
    }
    static createHTML(callback, isOrdered, css) {
        const messagesTemp = game.messages.contents;
        const option = isOrdered ? (a, b) => {
            let prev = a.flags["mrkb-chat-enhancements"]?.order;
            let next = b.flags["mrkb-chat-enhancements"]?.order;
            if (String(prev) && String(next)) return (prev - next);
            else return (a.timestamp - b.timestamp);
        } : (a, b) => {
            let prev = a.timestamp;
            let next = b.timestamp;
            return (prev - next);
        }
        const messages = messagesTemp.sort(option);
        const firstMessageDate = messagesTemp[0].timestamp;
        const list = [];
        let index = 0;

        messages.forEach((e) => {
            e.exporting = true;
            e.renderHTML().then((i) => {
                if (!i) {
                    index++;
                    return;
                }
                const image = i?.querySelectorAll("img");
                image.forEach((img) => img.setAttribute("src", img.src));

                list.push(i);

                if (index === messages.length - 1) {
                    if (isOrdered) list.sort((a, b) => {
                        let prev = a.dataset.order;
                        let next = b.dataset.order;
                        if (String(prev) && String(next)) return (prev - next);
                        else return (a.timestamp - b.timestamp);
                    });
                    callback(list, firstMessageDate, css);
                }else {
                    index++;
                }
            })
        });
    }

    // [CENEFORPG fork] 단일 URL → base64 data URI (실패 시 원본 URL 반환)
    static async toDataURL(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) return url;
            const blob = await res.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(url);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return url;
        }
    }

    // [CENEFORPG fork] 요소 내 모든 <img> 를 data URI 로 치환 (동일 URL 은 한 번만 받아 캐시)
    static async embedImages(root) {
        const imgs = [...root.querySelectorAll("img")];
        const uniques = [...new Set(imgs.map(i => i.getAttribute("src")).filter(s => s && !s.startsWith("data:")))];
        const cache = new Map();
        await Promise.all(uniques.map(async (src) => cache.set(src, await ChatExporter.toDataURL(src))));
        imgs.forEach((img) => {
            const src = img.getAttribute("src");
            if (cache.has(src)) img.setAttribute("src", cache.get(src));
        });
    }

    // [CENEFORPG fork] CSS 파일 텍스트로 인라인. 내부 url(...) 은 절대경로로 치환(온라인 시 폰트/배경 로드).
    static async fetchCss(cssUrl) {
        try {
            const res = await fetch(cssUrl);
            if (!res.ok) return "";
            let text = await res.text();
            text = text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
                if (/^(data:|https?:|\/\/|#)/.test(u)) return m;
                try { return `url("${new URL(u, cssUrl).href}")`; } catch (e) { return m; }
            });
            return `\n/* ${cssUrl} */\n${text}`;
        } catch (e) {
            return "";
        }
    }

    // [CENEFORPG fork] 내보내기에 필요한 모든 CSS 를 한 덩어리 텍스트로 수집 (priv_talk.css 는 맨 뒤)
    static async collectCss() {
        const origin = window.location.origin;
        const urls = [
            `${origin}/css/foundry2.css`,
            ...game.system.styles.map(e => `${origin}/${e.src}`),
            `${origin}/${MODULE_PATH}/styles/chat.css`,
        ];
        if (game.modules.get("sch-customize")?.active)
            urls.push(`${origin}/modules/sch-customize/styles/priv_talk.css`);
        const texts = await Promise.all(urls.map(u => ChatExporter.fetchCss(u)));
        return texts.join("\n");
    }

    // [CENEFORPG fork] 모든 CSS 뒤에 와야 하는 보정 스타일: 잡담 변수값 주입 + dnd5e2 헤더 잘림 수정 (+ 옵션: 양피지 배경 제거)
    static extraCSS(noBg = false) {
        const root = getComputedStyle(document.documentElement);
        const vars = ["--priv-talk-font-color", "--priv-talk-font-size", "--priv-talk-margin-left", "--sch-cus-chat-font-size"]
            .map(v => `${v}:${root.getPropertyValue(v).trim()};`).join("");
        const noBgCss = noBg ? `
            /* 양피지/질감 배경 제거 (무지 배경) */
            body { background: #ffffff !important; }
            #chat-log .chat-message { --chat-message-background: #f8f4f1 !important; background-image: none !important; background-color: #f8f4f1 !important; }
            /* dnd5e2 는 메시지 위에 ::before/::after 로 질감(texture-*.webp)을 덧씌우므로 그 이미지도 제거 */
            #chat-log .chat-message::before, #chat-log .message::before,
            #chat-log .chat-message::after, #chat-log .message::after { background-image: none !important; }
        ` : "";
        return `
            :root{${vars}}
            body { padding: 0; }
            .chat-log { padding: 0; margin: 0; }
            /* dnd5e2 헤더(아바타+이름)가 height:36px h4 안에서 세로로 겹쳐 잘리던 문제 수정 */
            #chat-log .message-header h4.message-sender { height: auto; overflow: visible; flex-direction: row; align-items: center; gap: 6px; }
            #chat-log .message-header h4.message-sender .avatar img { width: 40px; height: 40px; flex: none; object-fit: cover; border-radius: 6px; }
            #chat-log .message-header h4.message-sender .name-stacked { display: flex; flex-direction: column; min-width: 0; overflow: visible; }
            /* 연속 발언 병합: 두 번째 메시지(.added)부터 이름 헤더 숨김 (포트레이트는 이미 숨겨짐). dnd5e2 헤더라 !important 필요 */
            #chat-log .chat-message.added .message-header h4.message-sender { display: none !important; }
            ${noBgCss}
        `;
    }

    static exportHTML(order = false, css = false, standalone = false, noBg = false) {
        const useCss = css || standalone; // 독립형은 CSS 인라인이 전제이므로 css 강제
        try {
            ChatExporter.createHTML(async (list, firstMessageDate, css) => {
                const ol = document.createElement("ol");
                ol.id = "chat-log";
                ol.className = "chat-log themed " + (document.querySelector("#interface").classList.contains("theme-dark") ? "theme-dark" : "theme-light");
                ol.append(...list);
                const body = document.createElement("body");
                body.append(ol);

                const head = document.createElement("head");
                const meta = document.createElement("meta");
                meta.setAttribute("charset", "UTF-8");
                const title = document.createElement("title");
                title.innerHTML = `${game.world.id} 로그`;
                head.append(meta, title);

                if (css) {
                    if (standalone) {
                        // [CENEFORPG fork] 완전 독립형: 메시지 이미지 base64 내장 + 모든 CSS 인라인
                        await ChatExporter.embedImages(ol);
                        const styleEl = document.createElement("style");
                        styleEl.innerHTML = (await ChatExporter.collectCss()) + ChatExporter.extraCSS(noBg);
                        head.append(styleEl);
                    } else {
                        const origin = window.location.origin;

                        const gameStyleLinks = document.createElement("link");
                        gameStyleLinks.rel = "stylesheet";
                        gameStyleLinks.href = `${origin}/css/foundry2.css`;

                        const systemStyleLinks = game.system.styles.map(e => {
                            const link = document.createElement("link");
                            link.rel = "stylesheet";
                            link.href = `${origin}/${e.src}`;
                            return link;
                        });

                        const moduleStyleLink = document.createElement("link");
                        moduleStyleLink.rel = "stylesheet";
                        moduleStyleLink.href = `${origin}/${MODULE_PATH}/styles/chat.css`;

                        head.append(gameStyleLinks, ...systemStyleLinks, moduleStyleLink);

                        // 잡담(sch-customize) CSS 는 보정 스타일보다 먼저 와야 변수가 덮어써진다
                        if (game.modules.get("sch-customize")?.active) {
                            const privLink = document.createElement("link");
                            privLink.rel = "stylesheet";
                            privLink.href = `${origin}/modules/sch-customize/styles/priv_talk.css`;
                            head.append(privLink);
                        }

                        const styles = document.createElement("style");
                        styles.innerHTML = ChatExporter.extraCSS(noBg);
                        head.append(styles);
                    }
                }

                const html = document.createElement("html");
                html.append(head, body);

                // 독립형은 인라인 CSS 손상을 막기 위해 공백 압축을 생략하고 줄바꿈만 제거
                let plainText = html.outerHTML.replace(/\n/g, "");
                if (!standalone) plainText = plainText.replace(/\s\s/g, "");

                const date = ChatExporter.realignTime(firstMessageDate);
                const time = `${date.ye}${date.mo}${date.da}-${date.ho}${date.mi}${date.se}`;
                const suffix = standalone ? "-standalone" : "";

                const file = new File([plainText], `${game.world.id}-log-${time}${suffix}.html`, { type: 'text/html' });
                const fileUrl = window.URL.createObjectURL(file);

                const a = document.createElement('a');
                a.download = `${game.world.id}-log-${time}${suffix}.html`;
                a.type = "text/html";
                a.href = fileUrl;
                a.target = "_blank";
                a.hidden = true;

                a.click();
                window.URL.revokeObjectURL(fileUrl);
            }, order, useCss);
        } catch (err) {
            //debug("Exporting Log", err, true);
        }
    }

    static exportPDF() {
        try {
            ChatExporter.createHTML((list, firstMessageDate, _) => {
                const isDark = document.querySelector("#interface").classList.contains("theme-dark");

                const body = document.createElement("ol");
                body.className = "chat-log chat-export-pdf themed " + (isDark ? "theme-dark" : "theme-light");
                body.append(...list);

                document.body.appendChild(body);
                window.print();
                document.body.removeChild(body);
            }, true);
        } catch (err) {
            //debug("Exporting PDF Log", err, true);
        }
    }
}