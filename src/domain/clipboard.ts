import { prepareWechatHtml } from "./wechatCopyPipeline";

export async function copyWechatHtml(html: string, plainText: string): Promise<void> {
  const preparedHtml = await prepareWechatHtml(html);
  const ClipboardItemCtor = window.ClipboardItem;

  if (navigator.clipboard?.write && ClipboardItemCtor) {
    try {
      await navigator.clipboard.write([
        new ClipboardItemCtor({
          "text/html": new Blob([preparedHtml], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        }),
      ]);
      return;
    } catch {
      copyWithExecCommand(html);
      return;
    }
  }

  copyWithExecCommand(preparedHtml);
}

function copyWithExecCommand(html: string): void {
  const container = document.createElement("div");
  container.setAttribute("contenteditable", "true");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.innerHTML = html;

  document.body.appendChild(container);

  const range = document.createRange();
  range.selectNodeContents(container);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  document.execCommand("copy");
  selection?.removeAllRanges();
  container.remove();
}
