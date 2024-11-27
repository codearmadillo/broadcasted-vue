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

type Options<TEvent> = {
  /**
   * Called when error occurs while receiving an event
   */
  errorCallback?: (eventName: TEvent, e: MessageEvent) => void;
  /**
   * Timeout in ms to check whether the channel is healthy. Defaults to 5 seconds. If set to 0, the check is not performed
   */
  timeoutInMs?: number;
};

export const broadcasted = <
  TEvent extends Event['event'],
  TValue = Extract<Event, { topic: TEvent }>['data']
>(
  event: TEvent,
  value: TValue,
  options: Options<TEvent>
) => {
  /**
   * If user's browser doesn't support BroadcastChannel, return standard Vue ref
   * This is highly unlikely, but we should be mindful of the possibility
   */
  if (!('BroadcastChannel' in window)) {
    console.error('BroadcastChannel is not supported in your browser');
    return ref(value);
  }

  let channel = new BroadcastChannel(event);
  let channelHealthCheckTimeoutInMs = options?.timeoutInMs ?? 1000;
  let shouldCheckChannelHealthyState = channelHealthCheckTimeoutInMs > 0;
  let channelHealthCheckInterval: any = null;
  const channelHealthCheckEventName = 'channelHealthCheck';

  /**
   * Vue reactivity callback necessary for correctly updating customRef when events arrive in channel
   */
  let triggerReactiveValueChangeCallback: () => void;

  function runChannelHealthCheck() {
    /**
     * Attempt to send a ping in the channel
     * If the channel is dead, try to re-establish it
     */
    try {
      channel.postMessage({ event: channelHealthCheckEventName });
    } catch(e) {
      console.error(`Error pinging channel with event '${event} - Attempting to re-establish channel'`);
      channel = new BroadcastChannel(event);
    }
  }

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
    if (options?.errorCallback) {
      options.errorCallback(event, e);
    }
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
    /**
     * Establish channel health-check interval if desired
     */
    if (shouldCheckChannelHealthyState) {
      channelHealthCheckInterval = setInterval(() => {
        runChannelHealthCheck();
      }, channelHealthCheckTimeoutInMs);
    }
  });
  onUnmounted(() => {
    /**
     * Get rid of health-check interval first
     */
    if (channelHealthCheckInterval) {
      clearInterval(channelHealthCheckInterval);
    }
    /**
     * Closing a channel generally disposes of event listeners
     * It is still a good practice to clean them up to prevent leaks
     */
    channel.removeEventListener('message', onBroadcastChannelMessage);
    channel.removeEventListener('messageerror', onBroadcastChannelError);
    channel.close();
  });

  /**
   * Use Vue's CustomRef to ensure flawless reactivity
   */
  const valueReference = customRef((track, trigger) => {
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
         * Before sending data - perform channel health check
         */
        runChannelHealthCheck();

        channel.postMessage(newValue);
      },
    };
  });

  return {
    channel, ref: valueReference
  }
};
