import React from 'react';

import { CWLabel } from './component_kit/cw_label';
import { CWText } from './component_kit/cw_text';
import { CWTextArea } from './component_kit/cw_text_area';

import { CWTextInput } from './component_kit/cw_text_input';
import { CWToggle } from './component_kit/cw_toggle';
import { CWRadioGroup } from './component_kit/cw_radio_group';
import type { RadioButtonType } from './component_kit/cw_radio_button';

type InputRowProps = {
  disabled?: boolean;
  maxLength?: number;
  onChangeHandler: (e) => void;
  placeholder?: string;
  textarea?: boolean;
  title: string;
  value: string | number;
};

export const InputRow = (props: InputRowProps) => {
  const {
    disabled,
    maxLength,
    onChangeHandler,
    placeholder,
    textarea,
    title,
    value,
  } = props;

  return (
    <div className="InputRow">
      {textarea && <CWLabel label={title} />}
      {textarea ? (
        <CWTextArea
          value={value}
          placeholder={placeholder}
          disabled={!!disabled}
          maxLength={maxLength}
          onInput={(e) => {
            onChangeHandler((e.target as any).value);
          }}
        />
      ) : (
        <CWTextInput
          label={title}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={!!disabled}
          onInput={(e) => {
            onChangeHandler((e.target as any).value);
          }}
        />
      )}
    </div>
  );
};

type ToggleRowProps = {
  caption?: (e) => string;
  defaultValue: boolean;
  disabled?: boolean;
  onToggle: (e) => void;
  title: string;
};

export const ToggleRow = (props: ToggleRowProps) => {
  const { caption, defaultValue, disabled, onToggle, title } = props;

  const [checked, setChecked] = React.useState<boolean>(defaultValue);

  return (
    <div className="ToggleRow">
      <CWLabel label={title} />
      <div className="toggle-and-caption">
        <CWToggle
          checked={checked}
          disabled={!!disabled}
          onChange={() => {
            setChecked(!checked);
            onToggle(checked);
          }}
        />
        {caption && <CWText type="caption">{caption(checked)}</CWText>}
      </div>
    </div>
  );
};

type IdRowProps = { id: string };

export const IdRow = (props: IdRowProps) => {
  const { id } = props;

  return (
    <div className="IDRow">
      <CWLabel label="ID" />
      <div className={`id ${!id.length && 'placeholder'}`}>
        {!id.length ? 'ID will show up here based on your name' : id}
      </div>
    </div>
  );
};

type SelectRowProps = {
  onChange: (e) => void;
  options: Array<RadioButtonType>;
  selected: string;
  title: string;
};

export const SelectRow = (props: SelectRowProps) => {
  const { options, selected, onChange, title } = props;

  return (
    <div className="SelectRow">
      <CWLabel label={title} />
      <CWRadioGroup
        name={title}
        options={options}
        toggledOption={selected}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
