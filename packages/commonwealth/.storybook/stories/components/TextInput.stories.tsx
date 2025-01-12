import React, { FC } from 'react';
import type { Meta } from "@storybook/react";

import { CWTextInput } from '../../../client/scripts/views/components/component_kit/new_designs/CWTextInput';
import { phosphorIconLookup } from '../phosphor_icon_lookup';

const iconOptions = [ undefined, ...Object.keys(phosphorIconLookup) ];

const input = {
  title: 'Components/Form Fields/TextInput',
  component: CWTextInput,
} satisfies Meta<typeof CWTextInput>;

export default input;

const palette = {
  "neutral-25": "#FBFBFB",
  "white": "#FFFFFF",
  "black": "#000000",
  "transparent": "rgba(255, 0, 0, 0)",
  "neutral-50": "#F7F7F7",
  "neutral-100": "#F0EFF0",
  "neutral-200": "#E0DFE1",
  "neutral-300": "#C1C0C2",
  "neutral-400": "#A09DA1",
  "neutral-500": "#656167",
  "neutral-600": "#514E52",
  "neutral-700": "#3D3A3E",
  "neutral-800": "#282729",
  "neutral-900": "#141315",
  "primary-25": "#F2F8FF",
  "primary-50": "#E5F1FF",
  "primary-100": "#CCE3FF",
  "primary-200": "#99C7FF",
  "primary-300": "#66ABFF",
  "primary-400": "#4D9DFF",
  "primary-500": "#338FFF",
  "primary-600": "#2972CC",
  "primary-700": "#1F5699",
  "primary-800": "#143966",
  "primary-900": "#001c3d",
  "green-25": "#F5FBEA",
  "green-50": "#EAF6D5",
  "green-100": "#D5EDAB",
  "green-200": "#C0E481",
  "green-300": "#B8E071",
  "green-400": "#ABDB58",
  "green-500": "#9AC54F",
  "green-600": "#7B9E3F",
  "green-700": "#5C762F",
  "green-800": "#3E4F20",
  "yellow-25": "#FFFCF2",
  "yellow-50": "#FFF9E5",
  "yellow-100": "#FFF2CC",
  "yellow-200": "#FFE699",
  "yellow-300": "#FFD966",
  "yellow-400": "#FFCC33",
  "yellow-500": "#FFBF00",
  "yellow-600": "#CC9900",
  "yellow-700": "#806000",
  "yellow-800": "#664C00",
  "rorange-25": "#FFF5F2",
  "rorange-50": "#FFEBE5",
  "rorange-100": "#FFD8CC",
  "rorange-200": "#FFB199",
  "rorange-300": "#FF8A66",
  "rorange-400": "#FF6333",
  "rorange-500": "#FF521D",
  "rorange-600": "#D63200",
  "rorange-700": "#992400",
  "rorange-800": "#721C01",
  "pink-25": "#FEF8FD",
  "pink-50": "#FDF1FB",
  "pink-100": "#FBE4F8",
  "pink-200": "#F7C9F2",
  "pink-300": "#F4AFEB",
  "pink-400": "#F094E5",
  "pink-500": "#EC79DE",
  "pink-600": "#E263D3",
  "pink-700": "#990087",
  "pink-800": "#700062",
  "purple-25": "#F7F2FF",
  "purple-50": "#EFE5FF",
  "purple-100": "#DECCFF",
  "purple-200": "#BD99FF",
  "purple-300": "#9C66FF",
  "purple-400": "#7A33FF",
  "purple-500": "#4700CC",
  "purple-600": "#340095",
  "purple-700": "#290075",
  "purple-800": "#180044",
}

type PhosphorIconProps = {
  iconName: any;
  color: string,
}

const PhosphorIcon: FC<PhosphorIconProps> = ({ iconName, color }) => {
  if (iconName === undefined) return null;

  const IconComponent = iconName ? phosphorIconLookup[iconName] : null;

  return (
    <IconComponent size={20} weight="regular" color={palette[color]} />
  );
};

const BaseStory = (isCompact: boolean, disabled: boolean) => {
  return {
    args: {
      placeholder: "Placeholder",
      disabled,
      isCompact,
      iconLeft: undefined,
      iconLeftColor: "neutral-600",
      iconRight: undefined,
      iconRightColor: "primary-500",
      width: 240,
      fullWidth: false,
    },
    argTypes: {
      placeholder: {
        control: { type: "text" },
      },
      disabled: {
        control: { type: "boolean" },
        options: [ true, false ],
      },
      isCompact: {
        control: { type: "boolean" },
        options: [ true, false ],
      },
      iconLeft: {
        control: { type: "select" },
        options: iconOptions,
      },
      iconLeftColor: {
        control: { type: "select" },
        options: Object.keys(palette),
      },
      iconRight: {
        control: { type: "select" },
        options: iconOptions,
      },
      iconRightColor: {
        control: { type: "select" },
        options: Object.keys(palette),
      },
      width: {
        control: { type: "number" },
      },
      fullWidth: {
        control: { type: "boolean" },
        options: [ true, false ],
      },
    },
    parameters: {
      controls: {
        exclude: [
          "autoComplete",
          "containerClassName",
          "darkMode",
          "defaultValue",
          "autoFocus",
          "value",
          "iconLeftonClick",
          "iconRightonClick",
          "label",
          "maxLength",
          "name",
          "onClick",
          "onInput",
          "onenterkey",
          "tabIndex",
          "inputClassName",
          "displayOnly",
          "hasLeftIcon",
          "hasRightIcon",
          "isTyping",
          "autoFocus",
          "inputValidationFn",
          "manualStatusMessage",
          "manualValidationStatus",
          "validationStatus",
          "size",
          "isCompact",
          "disabled",
        ],
      }
    },
    render: ({...args}) => (
      <CWTextInput
        name="Text field"
        {...args}
        iconLeft={
          !!args.iconLeft ? <PhosphorIcon iconName={args.iconLeft} color={args.iconLeftColor} /> : undefined
        }
        iconRight={
          !!args.iconRight ? <PhosphorIcon iconName={args.iconRight} color={args.iconRightColor} /> : undefined
        }
      />
    ),
  };
};

export const Small = { ...BaseStory(true, false) };
export const SmallDisabled = { ...BaseStory(true, true) };
export const Large = { ...BaseStory(false, false) };
export const LargeDisabled = { ...BaseStory(false, true) };
