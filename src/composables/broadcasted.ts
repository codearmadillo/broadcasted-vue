import { onMounted, onUnmounted, ref, customRef } from 'vue';

type Event = | {
  event: 'HelloWorld';
  data: number
} | {
  event: 'HelloWorld1';
  data: number
} | {
  event: 'HelloWorld2';
  data: number
};

type Options = {
  error?: (...args: any[]) => void;
};

export const broadcasted = <
  TEvent extends Event['event'],
  TValue = Extract<Event, { topic: TEvent }>['data']
>(
  event: TEvent,
  value: TValue,
  options?: Options | {}
) => {
  /**
   * If user's browser doesn't support BroadcastChannel, return standard Vue ref
   * This is highly unlikely, but we should be mindful of the possibility
   */
  if (!('BroadcastChannel' in window)) {
    console.error('BroadcastChannel is not supported in your browser');
    return ref(value);
  }

  let triggerReactiveValueChangeCallback: () => void;
  let closed = false;
  const channel = new BroadcastChannel(event);

  function onBroadcastChannelMessage(e: MessageEvent) {
    if (!triggerReactiveValueChangeCallback) {
      console.error(
        `Error triggering Vue reactivity hook when setting value for event ${event} - Trigger callback is not defined.`
      );
      return;
    }
    value = e.data as TValue;
    triggerReactiveValueChangeCallback();
  }
  function onBroadcastChannelError(e: MessageEvent) {
    console.error(
      `Error receiving event ${event} - ${e?.data}. This usually means that the event was not sent correctly and message cannot be serialised`
    );
  }

  /**
   * Component lifecycle callbacks
   */
  onMounted(() => {
    if (!channel) {
      console.error(
        'Something went wrong when initializing BroadcastChannel - event listeners will not work as expected'
      );
    }
    channel.addEventListener('message', onBroadcastChannelMessage);
    channel.addEventListener('messageerror', onBroadcastChannelError);
  });
  onUnmounted(() => {
    /**
     * Closing a channel generally disposes of event listeners
     * It is still a good practice to clean them up to prevent leaks
     */
    channel.removeEventListener('message', onBroadcastChannelMessage);
    channel.removeEventListener('messageerror', onBroadcastChannelError);
    channel.close();
    closed = true;
  });

  /**
   * Use Vue's CustomRef to ensure flawless reactivity
   */
  const ref = customRef((track, trigger) => {
    /**
     * Vue's callback for change detection
     */
    triggerReactiveValueChangeCallback = trigger;
    return {
      get() {
        track();
        return value;
      },
      set(newValue: TValue) {
        value = newValue;
        trigger();

        if (!channel) {
          return;
        }

        /**
         * Safe-guard against closed channels (unlikely..)
         */
        if (closed) {
          console.error(
            `Something went wrong - Attempted to propagate event '${event}' but the channel was closed`
          );
        }

        channel.postMessage(newValue);
      },
    };
  });

  return {
    channel, ref
  }
};
