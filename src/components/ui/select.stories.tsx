import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from 'storybook/test';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Label } from './label';

const meta: Meta<typeof Select> = {
  title: 'Components/UI/Select',
  component: Select,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-background p-6" style={{ minHeight: '100dvh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-6" style={{ maxWidth: 420 }}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="default-select">소속 (Medium - Default)</Label>
        <Select>
          <SelectTrigger id="default-select" className="w-full" data-testid="select-trigger">
            <SelectValue placeholder="소속 선택 안 함" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">소속 선택 안 함</SelectItem>
            <SelectItem value="1">청년회</SelectItem>
            <SelectItem value="2">창년회</SelectItem>
            <SelectItem value="3">학생회</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByTestId('select-trigger');
    
    // 1. Check trigger is rendered and has the placeholder
    await expect(trigger).toBeInTheDocument();
    await expect(within(trigger).getByText('소속 선택 안 함')).toBeInTheDocument();
    
    // 2. Click trigger to open select dropdown
    await userEvent.click(trigger);
    
    // 3. Since Radix Portal renders the dropdown outside of the canvasElement (in body),
    // we search the global document body for the item.
    const body = within(document.body);
    const option = body.getByText('청년회');
    await expect(option).toBeInTheDocument();
    
    // 4. Click the option to select it
    await userEvent.click(option);
    
    // 5. The dropdown should close and the trigger should display the selected option
    await expect(within(trigger).getByText('청년회')).toBeInTheDocument();
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6" style={{ maxWidth: 420 }}>
      {/* Small */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="small-select">Small Size</Label>
        <Select size="small">
          <SelectTrigger id="small-select" className="w-full">
            <SelectValue placeholder="소속 선택 안 함" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">소속 선택 안 함</SelectItem>
            <SelectItem value="1">청년회</SelectItem>
            <SelectItem value="2">창년회</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Medium */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="medium-select">Medium Size</Label>
        <Select size="medium">
          <SelectTrigger id="medium-select" className="w-full">
            <SelectValue placeholder="소속 선택 안 함" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">소속 선택 안 함</SelectItem>
            <SelectItem value="1">청년회</SelectItem>
            <SelectItem value="2">창년회</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Large */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="large-select">Large Size</Label>
        <Select size="large">
          <SelectTrigger id="large-select" className="w-full">
            <SelectValue placeholder="소속 선택 안 함" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">소속 선택 안 함</SelectItem>
            <SelectItem value="1">청년회</SelectItem>
            <SelectItem value="2">창년회</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
};

export const Borderless: Story = {
  render: () => (
    <div className="flex flex-col gap-6" style={{ maxWidth: 420 }}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="borderless-select">Borderless Sorting (Small)</Label>
        <Select size="small" defaultValue="desc">
          <SelectTrigger id="borderless-select" className="w-[85px] border-0 bg-transparent shadow-none p-0 text-[14px] font-medium focus:ring-0 focus:ring-offset-0 hover:bg-neutral-100 rounded-sm px-1.5 py-0.5">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">최신순</SelectItem>
            <SelectItem value="asc">오래된순</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
};
