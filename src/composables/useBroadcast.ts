import { onMounted, onUnmounted, customRef } from 'vue';

export const Topic = {
  AuctionProductCreatedEvent: 'AuctionProductCreated',
  UserCreatedEvent: 'UserCreated',
  CountIncreasedEvent: 'CountIncreased',
} as const;
type Topic = (typeof Topic)[keyof typeof Topic];

type Event =
  | {
      topic: typeof Topic.AuctionProductCreatedEvent;
      data: {
        type: 'deleted';
        productId: string;
      };
    }
  | {
      topic: typeof Topic.UserCreatedEvent;
      data: {
        userId: string;
      };
    }
  | {
      topic: typeof Topic.CountIncreasedEvent;
      data: number;
    };

export const broadcasted = <
  TValue = Extract<Event, { topic: T }>['data']
>(
  topic: keyof Topic,
  value: TValue,
  // Potential extensions
  options?: {
    // Do we want option to send events in window scope with the same API?
    type: 'broadcast' | 'window';
    // Does it make sense to have error handler for Broadcast channel?
    error: (...args: any[]) => void;
    // Does this break the point of this utility - to have declarative code?
    map: (data: any) => TValue;
  }
) => {
  let isSupported = 'BroadcastChannel' in window;
  let channel: BroadcastChannel | null;

  let triggerChanges: () => void;

  function onChannelMessage(event: MessageEvent) {
    if (!triggerChanges) {
      console.error(
        `Something went wrong when setting up custom ref (possible race condition)`
      );
      return;
    }
    value = event.data as TValue;
    triggerChanges();
  }
  function onChannelMessageError() {
    console.error(
      `[BroadcastChannel:${String(topic)}] Error receiving message.`
    );
  }

  onMounted(() => {
    if (!isSupported) {
      return;
    }
    /**
     * Note: Can this be stored on window to prevent multiple listeners to same channel
     */
    channel = new BroadcastChannel(String(topic));
    channel.addEventListener('message', onChannelMessage);
    channel.addEventListener('messageerror', onChannelMessageError);
  });
  onUnmounted(() => {
    if (!channel) {
      return;
    }
    channel.removeEventListener('message', onChannelMessage);
    channel.removeEventListener('messageerror', onChannelMessageError);
    channel.close();
  });

  return customRef((track, trigger) => {
    triggerChanges = trigger;
    return {
      get() {
        track();
        return value;
      },
      set(newValue: TValue) {
        value = newValue;
        trigger();
        if (isSupported && channel) {
          channel.postMessage(newValue);
        }
      },
    };
  });
};
