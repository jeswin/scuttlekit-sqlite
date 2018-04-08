/*
  From https://github.com/ssbc/ssb-typescript
*/

/**
 * Starts with @
 */
export type FeedId = string;

/**
 * Starts with %
 */
export type MsgId = string;

/**
 * Starts with &
 */
export type BlobId = string;

export type Msg<C> = {
  key: MsgId;
  value: {
    previous: MsgId;
    author: FeedId;
    sequence: number;
    timestamp: number;
    hash: "sha256";
    content: C;
    signature: string;
  };
};
