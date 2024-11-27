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

  /**
   * Internal event model
   */
  type ChannelEvent = {
    name: TEvent,
    data: TValue,
  }

  const CHANNEL_NAME = 'ap';
  const CHANNEL_HEALTH_CHECK_EVENT_NAME = 'channelHealthCheck';

  let channel = ref(new BroadcastChannel(CHANNEL_NAME));
  let channelHealthCheckTimeoutInMs = options?.timeoutInMs ?? 1000;
  let shouldCheckChannelHealthyState = channelHealthCheckTimeoutInMs > 0;
  let channelHealthCheckInterval: any = null;

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
      channel.value.postMessage({ event: CHANNEL_HEALTH_CHECK_EVENT_NAME });
    } catch(e) {
      console.error(`Error pinging channel with event '${event} - Attempting to re-establish channel'`);
      channel.value = new BroadcastChannel(CHANNEL_NAME);
    }
  }

  function onBroadcastChannelMessage(e: MessageEvent<ChannelEvent>) {
    if (!triggerReactiveValueChangeCallback) {
      console.error(
        `Error triggering Vue reactivity hook when setting value for event ${event} - Trigger callback is not defined.`
      );
      return;
    }

    if (e.data.name !== event) {
      return;
    }

    value = e.data.data;
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

  function postToChannel(value: TValue) {
    const message: ChannelEvent = {
      name: event,
      data: value
    }

    /**
     * Before sending data - perform channel health check
     */
    runChannelHealthCheck();

    /**
     * Send entire event to channel
     */
    channel.value.postMessage(message);
  }

  /**
   * Component lifecycle callbacks
   */
  onMounted(() => {
    if (!channel.value) {
      console.error(
        'Something went wrong when initializing BroadcastChannel - event listeners will not work as expected'
      );
    }
    channel.value.addEventListener('message', onBroadcastChannelMessage);
    channel.value.addEventListener('messageerror', onBroadcastChannelError);
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
    channel.value.removeEventListener('message', onBroadcastChannelMessage);
    channel.value.removeEventListener('messageerror', onBroadcastChannelError);
    channel.value.close();
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
        postToChannel(newValue);
      },
    };
  });

  return {
    channel, ref: valueReference
  }
};
