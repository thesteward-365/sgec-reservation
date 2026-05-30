import type { Meta, StoryObj } from '@storybook/react';
import { Button2 } from './button2';

const meta: Meta<typeof Button2> = {
  title: 'Components/UI/Button2',
  component: Button2,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['contained', 'outlined', 'text', 'subtle'],
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button2>;

export const Contained: Story = {
  args: {
    children: 'Contained Button',
    variant: 'contained',
    color: 'primary',
  },
};

export const Outlined: Story = {
  args: {
    children: 'Outlined Button',
    variant: 'outlined',
    color: 'primary',
  },
};

export const Text: Story = {
  args: {
    children: 'Text Button',
    variant: 'text',
    color: 'primary',
  },
};

export const Subtle: Story = {
  args: {
    children: 'Subtle Button',
    variant: 'subtle',
    color: 'primary',
  },
};

export const AllColors: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div className="space-y-4">
        <h3 className="text-h4 font-bold">Contained</h3>
        <p className="text-caption text-muted-foreground mb-2">Secondary is now Black like the original Button.</p>
        <div className="flex flex-wrap gap-2">
          <Button2 color="primary">Primary</Button2>
          <Button2 color="secondary">Secondary (Black)</Button2>
          <Button2 color="success">Success</Button2>
          <Button2 color="error">Error</Button2>
          <Button2 color="warning">Warning</Button2>
          <Button2 color="info">Info</Button2>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-h4 font-bold">Subtle</h3>
        <p className="text-caption text-muted-foreground mb-2">Subtle variant now has distinct background colors for all states.</p>
        <div className="flex flex-wrap gap-2">
          <Button2 variant="subtle" color="primary">Primary</Button2>
          <Button2 variant="subtle" color="secondary">Secondary</Button2>
          <Button2 variant="subtle" color="success">Success</Button2>
          <Button2 variant="subtle" color="error">Error</Button2>
          <Button2 variant="subtle" color="warning">Warning</Button2>
          <Button2 variant="subtle" color="info">Info</Button2>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-h4 font-bold">Outlined</h3>
        <div className="flex flex-wrap gap-2">
          <Button2 variant="outlined" color="primary">Primary</Button2>
          <Button2 variant="outlined" color="secondary">Secondary</Button2>
          <Button2 variant="outlined" color="success">Success</Button2>
          <Button2 variant="outlined" color="error">Error</Button2>
          <Button2 variant="outlined" color="warning">Warning</Button2>
          <Button2 variant="outlined" color="info">Info</Button2>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-h4 font-bold">Text</h3>
        <div className="flex flex-wrap gap-2">
          <Button2 variant="text" color="primary">Primary</Button2>
          <Button2 variant="text" color="secondary">Secondary</Button2>
          <Button2 variant="text" color="success">Success</Button2>
          <Button2 variant="text" color="error">Error</Button2>
          <Button2 variant="text" color="warning">Warning</Button2>
          <Button2 variant="text" color="info">Info</Button2>
        </div>
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-2">
      <Button2 size="small">Small</Button2>
      <Button2 size="medium">Medium</Button2>
      <Button2 size="large">Large</Button2>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button2 disabled color="primary">Contained</Button2>
        <Button2 disabled variant="outlined" color="primary">Outlined</Button2>
        <Button2 disabled variant="subtle" color="primary">Subtle</Button2>
        <Button2 disabled variant="text" color="primary">Text</Button2>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button2 disabled color="secondary">Contained</Button2>
        <Button2 disabled variant="outlined" color="secondary">Outlined</Button2>
        <Button2 disabled variant="subtle" color="secondary">Subtle</Button2>
        <Button2 disabled variant="text" color="secondary">Text</Button2>
      </div>
    </div>
  ),
};
