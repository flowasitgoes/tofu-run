"use client";

import Image from "next/image";
import { useLocale } from "@/components/LocaleProvider";
import {
  MAX_TOPPING_PICKS,
  TOFU_TYPES,
  type TofuTypeId,
} from "@/lib/constants";
import {
  formatDouhuaGoalLocalized,
  getTofuShortLocalized,
} from "@/lib/i18n-labels";

type ToppingPickerProps = {
  selected: TofuTypeId[];
  pickNone: boolean;
  onChange: (ids: TofuTypeId[]) => void;
  onPickNone: (value: boolean) => void;
};

export function ToppingPicker({
  selected,
  pickNone,
  onChange,
  onPickNone,
}: ToppingPickerProps) {
  const { locale, t } = useLocale();
  const atMax = selected.length >= MAX_TOPPING_PICKS;
  const goal = formatDouhuaGoalLocalized(selected, pickNone, locale);
  const showGoal = pickNone || selected.length > 0;

  function toggle(id: TofuTypeId) {
    if (pickNone) onPickNone(false);
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
      return;
    }
    if (atMax) return;
    onChange([...selected, id]);
  }

  function toggleNone() {
    if (pickNone) {
      onPickNone(false);
      return;
    }
    onChange([]);
    onPickNone(true);
  }

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 flex w-full items-baseline justify-between text-xs font-medium text-brown-sugar/70">
        <span>{t("toppings.legend")}</span>
        <span className="font-normal text-brown-sugar/45">
          {pickNone
            ? t("toppings.noneSelected")
            : t("toppings.pickHint", {
                count: selected.length,
                max: MAX_TOPPING_PICKS,
              })}
        </span>
      </legend>

      <div className="grid grid-cols-3 gap-2">
        {TOFU_TYPES.map((topping) => {
          const isSelected = selected.includes(topping.id);
          const isDisabled = pickNone || (!isSelected && atMax);

          return (
            <label
              key={topping.id}
              className={`relative flex cursor-pointer flex-col items-center rounded-2xl border-2 p-3 transition-all ${
                isSelected
                  ? "border-brown-sugar bg-cream shadow-md shadow-brown-sugar/10"
                  : isDisabled
                    ? "cursor-not-allowed border-brown-sugar/5 bg-cream/40 opacity-50"
                    : "border-brown-sugar/10 bg-tofu-white/80 hover:border-sunset/40 hover:bg-cream/80"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => toggle(topping.id)}
              />
              {isSelected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brown-sugar text-[10px] text-cream">
                  ✓
                </span>
              )}
              <Image
                src={topping.image}
                alt={getTofuShortLocalized(topping.id, locale)}
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
              <span
                className="mt-1.5 text-xs font-medium"
                style={{ color: isSelected ? topping.color : undefined }}
              >
                {getTofuShortLocalized(topping.id, locale)}
              </span>
            </label>
          );
        })}

        <label
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 p-3 transition-all ${
            pickNone
              ? "border-brown-sugar bg-cream shadow-md shadow-brown-sugar/10"
              : "border-dashed border-brown-sugar/20 bg-tofu-white/60 hover:border-brown-sugar/30 hover:bg-cream/80"
          }`}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={pickNone}
            onChange={toggleNone}
          />
          {pickNone && (
            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brown-sugar text-[10px] text-cream">
              ✓
            </span>
          )}
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full text-xl leading-none ${
              pickNone
                ? "bg-brown-sugar/10 text-brown-sugar"
                : "bg-brown-sugar/5 text-brown-sugar/40"
            }`}
          >
            ×
          </span>
          <span className="mt-1.5 text-xs font-medium text-brown-sugar/70">
            {t("toppings.noneSelected")}
          </span>
        </label>
      </div>

      {showGoal ? (
        <div className="rounded-2xl border border-sunset/25 bg-gradient-to-r from-sunset/15 to-tofu-white px-4 py-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-brown-sugar/50">
            {t("toppings.yourGoal")}
          </p>
          <p className="mt-1 text-lg font-bold text-brown-sugar">{goal}</p>
        </div>
      ) : (
        <p className="text-center text-xs text-brown-sugar/40">
          {t("toppings.pickOrNone")}
        </p>
      )}
    </fieldset>
  );
}
