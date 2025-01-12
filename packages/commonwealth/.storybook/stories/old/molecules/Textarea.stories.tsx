import React from 'react';
import type { Meta, StoryObj } from "@storybook/react";

import { CWTextArea } from '../../../../client/scripts/views/components/component_kit/cw_text_area';

const textarea = {
  title: 'Old/Molecules/Textarea',
  component: CWTextArea,
} satisfies Meta<typeof CWTextArea>;

export default textarea;
type Story = StoryObj<typeof textarea>;

export const Textarea: Story = {
  args: {
    label: "Text area",
    placeholder: "Type here",
  },
  argTypes: {
    label: {
      control: { type: "text" },
    },
    placeholder: {
      control: { type: "text" },
    },
  },
  parameters: {
    controls: {
      exclude: [
        "autoComplete",
        "autoFocus",
        "containerClassName",
        "defaultValue",
        "disabled",
        "value",
        "iconRight",
        "iconRightonClick",
        "inputValidationFn",
        "maxLength",
        "name",
        "onClick",
        "onInput",
        "onenterkey",
        "tabIndex",
        "manualStatusMessage",
        "manualValidationStatus",
        "validationStatus",
      ],
    }
  },
  render: ({...args}) => (
    <CWTextArea
      name="Textarea"
      label={args.label}
      placeholder={args.placeholder}
    />
  ),
};
