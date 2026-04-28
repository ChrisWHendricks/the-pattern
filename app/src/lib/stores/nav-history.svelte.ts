function createNavHistory() {
  let stack = $state<string[]>([]);
  let position = $state(-1);
  let skipNext = false;

  return {
    get canGoBack() { return position > 0; },
    get canGoForward() { return position < stack.length - 1; },

    push(path: string) {
      if (skipNext) {
        skipNext = false;
        return;
      }
      const newStack = stack.slice(0, position + 1);
      newStack.push(path);
      stack = newStack;
      position = stack.length - 1;
    },

    back(): string | null {
      if (position <= 0) return null;
      skipNext = true;
      position--;
      return stack[position];
    },

    forward(): string | null {
      if (position >= stack.length - 1) return null;
      skipNext = true;
      position++;
      return stack[position];
    },
  };
}

export const navHistory = createNavHistory();
