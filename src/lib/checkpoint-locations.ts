export type CheckpointLocation = {
  lat: number;
  lng: number;
};

export type CheckpointTokenId =
  | "start"
  | "taro"
  | "tapioca"
  | "peanut"
  | "redbean"
  | "mungbean"
  | "tofu-01"
  | "tofu-02"
  | "tofu-03"
  | "tofu-04"
  | "tofu-05"
  | "tofu-06";

/**
 * 高雄中央公園 Token 預設定位座標（WGS84）
 * 用於後續距離計算、地圖標記與掃描驗證輔助。
 */
export const CHECKPOINT_LOCATIONS: Record<CheckpointTokenId, CheckpointLocation> = {
  start: { lat: 22.625610231699287, lng: 120.30036990400676 },
  taro: { lat: 22.62509351035126, lng: 120.3007951769279 },
  tapioca: { lat: 22.62371376980628, lng: 120.29995684382637 },
  peanut: { lat: 22.62302549126543, lng: 120.29883568047606 },
  redbean: { lat: 22.62536265330242, lng: 120.29881958722224 },
  mungbean: { lat: 22.626694619824104, lng: 120.30100290532549 },
  "tofu-01": { lat: 22.62473875376479, lng: 120.30074541326417 },
  "tofu-02": { lat: 22.62337210678863, lng: 120.300761506518 },
  "tofu-03": { lat: 22.624402044901476, lng: 120.29835288286108 },
  "tofu-04": { lat: 22.625258670242776, lng: 120.29835288286108 },
  "tofu-05": { lat: 22.625684505131392, lng: 120.29762868643863 },
  "tofu-06": { lat: 22.626075677878315, lng: 120.2992165541501 },
};

export function getCheckpointLocation(
  tokenType: string
): CheckpointLocation | null {
  if (tokenType in CHECKPOINT_LOCATIONS) {
    return CHECKPOINT_LOCATIONS[tokenType as CheckpointTokenId];
  }
  return null;
}
