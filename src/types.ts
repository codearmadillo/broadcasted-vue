export const Events = {
  AuctionProductCreatedEvent: 'AuctionProductCreated',
} as const;
type Events = (typeof Events)[keyof typeof Events];
