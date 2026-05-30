import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'Components/UI/Button',
  component: Button,
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
type Story = StoryObj<typeof Button>;

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
        <p className="text-caption text-muted-foreground mb-2">
          Secondary is now Black like the original Button.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button color="primary">Primary</Button>
          <Button color="secondary">Secondary (Black)</Button>
          <Button color="success">Success</Button>
          <Button color="error">Error</Button>
          <Button color="warning">Warning</Button>
          <Button color="info">Info</Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-h4 font-bold">Subtle</h3>
        <p className="text-caption text-muted-foreground mb-2">
          Subtle variant now has distinct background colors for all states.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="subtle" color="primary">
            Primary
          </Button>
          <Button variant="subtle" color="secondary">
            Secondary
          </Button>
          <Button variant="subtle" color="success">
            Success
          </Button>
          <Button variant="subtle" color="error">
            Error
          </Button>
          <Button variant="subtle" color="warning">
            Warning
          </Button>
          <Button variant="subtle" color="info">
            Info
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-h4 font-bold">Outlined</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outlined" color="primary">
            Primary
          </Button>
          <Button variant="outlined" color="secondary">
            Secondary
          </Button>
          <Button variant="outlined" color="success">
            Success
          </Button>
          <Button variant="outlined" color="error">
            Error
          </Button>
          <Button variant="outlined" color="warning">
            Warning
          </Button>
          <Button variant="outlined" color="info">
            Info
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-h4 font-bold">Text</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="text" color="primary">
            Primary
          </Button>
          <Button variant="text" color="secondary">
            Secondary
          </Button>
          <Button variant="text" color="success">
            Success
          </Button>
          <Button variant="text" color="error">
            Error
          </Button>
          <Button variant="text" color="warning">
            Warning
          </Button>
          <Button variant="text" color="info">
            Info
          </Button>
        </div>
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-2">
      <Button size="small">Small</Button>
      <Button size="medium">Medium</Button>
      <Button size="large">Large</Button>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button disabled color="primary">
          Contained
        </Button>
        <Button disabled variant="outlined" color="primary">
          Outlined
        </Button>
        <Button disabled variant="subtle" color="primary">
          Subtle
        </Button>
        <Button disabled variant="text" color="primary">
          Text
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled color="secondary">
          Contained
        </Button>
        <Button disabled variant="outlined" color="secondary">
          Outlined
        </Button>
        <Button disabled variant="subtle" color="secondary">
          Subtle
        </Button>
        <Button disabled variant="text" color="secondary">
          Text
        </Button>
      </div>
    </div>
  ),
};
