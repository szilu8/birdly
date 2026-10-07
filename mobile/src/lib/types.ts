export type Rarity = 'gyakori' | 'ritka' | 'epikus' | 'legendas';

export type Species = {
  id: string;
  name: string;
  emoji: string;
  delivery_seconds: number;
  rest_seconds: number;
  rarity: Rarity;
  hatch_weight: number;
  description: string;
  enabled: boolean;
  sort: number;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_color: string;
  created_at: string;
};

export type Bird = {
  id: string;
  owner_id: string;
  species_id: string;
  name: string;
  hatched_at: string;
  last_sent_at: string | null;
  arrives_at: string | null;
  ready_at: string | null;
};

export type Egg = {
  id: string;
  owner_id: string;
  laid_at: string;
  hatches_at: string;
};

export type Post = {
  id: string;
  sender_id: string;
  recipient_id: string;
  bird_name: string;
  species_id: string;
  image_path: string;
  caption: string;
  sent_at: string;
  arrive_at: string;
  expires_at: string;
  liked_at: string | null;
};

export type FeedPost = Post & { sender: Profile | null; imageUrl: string | null };

export type Incoming = {
  post_id: string;
  sender_id: string;
  sender_name: string;
  species_id: string;
  arrive_at: string;
};

export type Friendship = {
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
};

export type FriendEntry = {
  profile: Profile;
  status: 'accepted' | 'incoming' | 'outgoing';
};

export type BirdStatus =
  | { kind: 'free' }
  | { kind: 'flying'; from: number; until: number }
  | { kind: 'resting'; from: number; until: number };
