// ─── Types ────────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'move';   x: number; y: number }
  | { type: 'click';  button: 'left' | 'right'; double?: boolean }
  | { type: 'type';   text: string }
  | { type: 'key';    key: string }
  | { type: 'scroll'; direction: 'up' | 'down'; amount: number };

export interface ActionResult {
  success: boolean;
  error?: { code: string; message: string };
  durationMs: number;
}

export interface IInputController {
  executeAction(action: Action): Promise<ActionResult>;
  getScreenBounds(): Promise<{ width: number; height: number }>;
  isAvailable(): Promise<boolean>;
}

// ─── InputController ─────────────────────────────────────────────────────────

export class InputController implements IInputController {
  private enabled: boolean = true;

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  /**
   * Maps common key names to nut-js Key enum values
   */
  private mapKeyName(keyName: string, Key: any): any {
    // Normalize input
    const normalized = keyName.toLowerCase().trim();
    
    // Direct mapping for common keys
    const keyMap: Record<string, string> = {
      // Letters (uppercase in nut-js)
      'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'e': 'E', 'f': 'F', 'g': 'G', 'h': 'H',
      'i': 'I', 'j': 'J', 'k': 'K', 'l': 'L', 'm': 'M', 'n': 'N', 'o': 'O', 'p': 'P',
      'q': 'Q', 'r': 'R', 's': 'S', 't': 'T', 'u': 'U', 'v': 'V', 'w': 'W', 'x': 'X',
      'y': 'Y', 'z': 'Z',
      
      // Numbers
      '0': 'Num0', '1': 'Num1', '2': 'Num2', '3': 'Num3', '4': 'Num4',
      '5': 'Num5', '6': 'Num6', '7': 'Num7', '8': 'Num8', '9': 'Num9',
      
      // Special keys
      'enter': 'Enter', 'return': 'Enter',
      'tab': 'Tab',
      'space': 'Space', 'spacebar': 'Space',
      'backspace': 'Backspace', 'back': 'Backspace',
      'delete': 'Delete', 'del': 'Delete',
      'escape': 'Escape', 'esc': 'Escape',
      
      // Arrow keys
      'up': 'Up', 'arrowup': 'Up',
      'down': 'Down', 'arrowdown': 'Down',
      'left': 'Left', 'arrowleft': 'Left',
      'right': 'Right', 'arrowright': 'Right',
      
      // Modifiers
      'shift': 'LeftShift', 'leftshift': 'LeftShift', 'rightshift': 'RightShift',
      'control': 'LeftControl', 'ctrl': 'LeftControl', 'leftcontrol': 'LeftControl', 'rightcontrol': 'RightControl',
      'alt': 'LeftAlt', 'leftalt': 'LeftAlt', 'rightalt': 'RightAlt',
      'command': 'LeftCmd', 'cmd': 'LeftCmd', 'meta': 'LeftCmd', 'leftcmd': 'LeftCmd', 'rightcmd': 'RightCmd',
      'win': 'LeftWin', 'windows': 'LeftWin', 'leftwin': 'LeftWin', 'rightwin': 'RightWin',
      
      // Function keys
      'f1': 'F1', 'f2': 'F2', 'f3': 'F3', 'f4': 'F4', 'f5': 'F5', 'f6': 'F6',
      'f7': 'F7', 'f8': 'F8', 'f9': 'F9', 'f10': 'F10', 'f11': 'F11', 'f12': 'F12',
      
      // Other common keys
      'home': 'Home',
      'end': 'End',
      'pageup': 'PageUp', 'pgup': 'PageUp',
      'pagedown': 'PageDown', 'pgdown': 'PageDown',
      'insert': 'Insert', 'ins': 'Insert',
      'capslock': 'CapsLock', 'caps': 'CapsLock',
      'numlock': 'NumLock',
      'scrolllock': 'ScrollLock',
      'pause': 'Pause',
      'printscreen': 'Print', 'print': 'Print', 'prtsc': 'Print',
    };
    
    // Try to find in map
    const mappedKey = keyMap[normalized];
    if (mappedKey && Key[mappedKey]) {
      return Key[mappedKey];
    }
    
    // Try original case-sensitive lookup
    if (Key[keyName]) {
      return Key[keyName];
    }
    
    // Try capitalized version (for letters)
    const capitalized = keyName.charAt(0).toUpperCase() + keyName.slice(1);
    if (Key[capitalized]) {
      return Key[capitalized];
    }
    
    // Fallback to original string
    return keyName;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Attempt to import nut-js to check availability
      await import('@nut-tree-fork/nut-js');
      return true;
    } catch {
      return false;
    }
  }

  async getScreenBounds(): Promise<{ width: number; height: number }> {
    try {
      const { screen } = await import('@nut-tree-fork/nut-js');
      const width = await screen.width();
      const height = await screen.height();
      return { width, height };
    } catch {
      // Fallback to common resolution if nut-js unavailable
      return { width: 1920, height: 1080 };
    }
  }

  async executeAction(action: Action): Promise<ActionResult> {
    const start = Date.now();

    // Check if system is enabled
    if (!this.enabled) {
      return {
        success: false,
        error: { code: 'CU_DISABLED', message: 'Computer Use system is disabled.' },
        durationMs: Date.now() - start,
      };
    }

    // Validate coordinates for mouse actions
    if (action.type === 'move') {
      const bounds = await this.getScreenBounds();
      if (action.x < 0 || action.x > bounds.width || action.y < 0 || action.y > bounds.height) {
        return {
          success: false,
          error: {
            code: 'CU_INPUT_OUT_OF_BOUNDS',
            message: `Coordinates (${action.x}, ${action.y}) are outside screen bounds (${bounds.width}x${bounds.height}).`,
          },
          durationMs: Date.now() - start,
        };
      }
    }

    try {
      const { mouse, keyboard, Key, Button } = await import('@nut-tree-fork/nut-js');

      switch (action.type) {
        case 'move': {
          await mouse.setPosition({ x: action.x, y: action.y });
          break;
        }
        case 'click': {
          const btn = action.button === 'right' ? Button.RIGHT : Button.LEFT;
          if (action.double) {
            await mouse.doubleClick(btn);
          } else {
            await mouse.click(btn);
          }
          break;
        }
        case 'type': {
          await keyboard.type(action.text);
          break;
        }
        case 'key': {
          const keyVal = this.mapKeyName(action.key, Key);
          await keyboard.pressKey(keyVal);
          await keyboard.releaseKey(keyVal);
          break;
        }
        case 'scroll': {
          const { mouse: scrollMouse } = await import('@nut-tree-fork/nut-js');
          if (action.direction === 'down') {
            await scrollMouse.scrollDown(action.amount);
          } else {
            await scrollMouse.scrollUp(action.amount);
          }
          break;
        }
      }

      return { success: true, durationMs: Date.now() - start };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'CU_INPUT_UNAVAILABLE',
          message: err?.message ?? 'nut-js native library unavailable.',
        },
        durationMs: Date.now() - start,
      };
    }
  }
}
