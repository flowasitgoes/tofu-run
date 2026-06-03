import type { TokenTypeId } from "@/lib/constants";

export type StopMapSlide = {
  tokenId: TokenTypeId;
  imageSrc: string;
};

/** public/stops 內各 Token 特寫地圖（順序依現場路線） */
export const STOP_MAP_SLIDES: StopMapSlide[] = [
  { tokenId: "taro", imageSrc: "/stops/taro.jpg" },
  // tofu-01：待補 /stops/tofu-01.jpg 後插入此處
  { tokenId: "tofu-02", imageSrc: "/stops/tofu-02.jpg" },
  { tokenId: "tapioca", imageSrc: "/stops/bubble.jpg" },
  { tokenId: "peanut", imageSrc: "/stops/peanut.jpg" },
  { tokenId: "redbean", imageSrc: "/stops/redbean.jpg" },
  { tokenId: "tofu-03", imageSrc: "/stops/tofu-03.jpg" },
  { tokenId: "tofu-04", imageSrc: "/stops/tofu-04.jpg" },
  { tokenId: "mungbean", imageSrc: "/stops/mungbean.jpg" },
];
