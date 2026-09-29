import { Input as AntInput } from 'antd';
import type { InputProps as AntInputProps, InputRef } from 'antd';
import type { PasswordProps, SearchProps, TextAreaProps } from 'antd/es/input';
import type { Ref } from 'react';

export type InputSize = 'small' | 'medium' | 'large';

export interface InputProps extends Omit<AntInputProps, 'size'> {
  size?: InputSize;
}

const sizeMap: Record<InputSize, AntInputProps['size']> = {
  small: 'small',
  medium: 'middle',
  large: 'large',
};

function mapSize<T extends { size?: InputSize }>(props: T) {
  const { size = 'medium', ...rest } = props;
  return { size: sizeMap[size], ...rest };
}

export const Input = Object.assign(
  function Input(props: InputProps & { ref?: Ref<InputRef> }) {
    return <AntInput {...mapSize(props)} />;
  },
  {
    Password: (props: PasswordProps) => <AntInput.Password {...props} />,
    Search: (props: SearchProps) => <AntInput.Search {...props} />,
    TextArea: (props: TextAreaProps) => <AntInput.TextArea {...props} />,
  },
);
