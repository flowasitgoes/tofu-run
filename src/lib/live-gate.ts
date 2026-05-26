/** API 用：無進行中 LIVE 場次 */
export const LIVE_NOT_ACTIVE_ERROR = "活動尚未開始或已結束，請等候主辦開放 LIVE";

export class LiveNotActiveError extends Error {
  constructor(message = LIVE_NOT_ACTIVE_ERROR) {
    super(message);
    this.name = "LiveNotActiveError";
  }
}
