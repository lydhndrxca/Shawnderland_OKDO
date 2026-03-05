export { default as UIButtonNode } from './UIButtonNode';
export { default as UITextBoxNode } from './UITextBoxNode';
export { default as UIDropdownNode } from './UIDropdownNode';
export { default as UIImageNode } from './UIImageNode';
export { default as UIWindowNode } from './UIWindowNode';
export { default as UIFrameNode } from './UIFrameNode';
export { default as UIGenericNode } from './UIGenericNode';

export const UI_ELEMENT_NODES = {
  uiButton: 'UIButtonNode',
  uiTextBox: 'UITextBoxNode',
  uiDropdown: 'UIDropdownNode',
  uiImage: 'UIImageNode',
} as const;

export const UI_CONTAINER_NODES = {
  uiWindow: 'UIWindowNode',
  uiFrame: 'UIFrameNode',
  uiGeneric: 'UIGenericNode',
} as const;
