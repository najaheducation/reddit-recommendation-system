import { Post } from "../atoms/PostAtom";

type RawRedditPost = {
  id: string;
  title: string;
  body: string;
  author: string;
  score: number;
  num_comments: number;
  subreddit: string;
  created_utc: string;
  url_overridden_by_dest?: string | null;
  [key: string]: any;
};

const rawPosts: RawRedditPost[] = [
  {
    kind: "post",
    query: "cute",
    id: "1pcbb9k",
    title: "Do we look cute? 😊",
    body: "",
    author: "kamila_wave",
    score: 1,
    upvote_ratio: 1,
    num_comments: 0,
    subreddit: "SoftDuo",
    created_utc: "2025-12-02T15:27:00.000Z",
    url: "https://www.reddit.com/r/SoftDuo/comments/1pcbb9k/do_we_look_cute/",
    flair: null,
    over_18: false,
    is_self: false,
    spoiler: false,
    locked: false,
    is_video: false,
    domain: "i.redd.it",
    thumbnail:
      "https://b.thumbs.redditmedia.com/v1tiJEo33Ezw4q3y_G5ju3vVEM_xicn0X8RyeSyHmpo.jpg",
    url_overridden_by_dest: "https://i.redd.it/k0xfmg327t4g1.jpeg",
    media: null,
    media_metadata: null,
    gallery_data: null,
  },
  {
    kind: "post",
    query: "cute",
    id: "1pcbb4d",
    title: "Sakusubaru Halloween (by  Roku821)",
    body: "Source: https://x.com/roku821/status/1995117147366773188?s=46\n(Admittedly a bit late for halloween but this art is cute, go show some love to the artist)",
    author: "AnimaShihyon",
    score: 1,
    upvote_ratio: 1,
    num_comments: 0,
    subreddit: "Natsubaru",
    created_utc: "2025-12-02T15:26:50.000Z",
    url: "https://www.reddit.com/r/Natsubaru/comments/1pcbb4d/sakusubaru_halloween_by_roku821/",
    flair: "Fanwork",
    over_18: false,
    is_self: false,
    spoiler: false,
    locked: false,
    is_video: false,
    domain: "i.redd.it",
    thumbnail:
      "https://a.thumbs.redditmedia.com/PnyqcWyeTMjdcWlagpOBnRWvctUgGqJ8r8fRDP6kRy8.jpg",
    url_overridden_by_dest: "https://i.redd.it/yo26a5f17t4g1.jpeg",
    media: null,
    media_metadata: null,
    gallery_data: null,
  },
  {
    kind: "post",
    query: "cute",
    id: "1pcbb32",
    title: "Bliss Splash Academy Always Full",
    body: "This is an annual post in this sub, it seems, but just a gentle reminder that Bliss' Splash Academy capacity during holidays is massively under the level of demand.\n\nOver Thanksgiving, we tried 3-4 times and never got in due to capacity. We were told repeatedly during sign up that Splash Academy would be full and to come early, so we weren't counting on it.\n\nI heard there were 1200 children on board and Splash Academy can only handle a tiny percentage of that (though 1200 may be children of various ages.)\n\nPart of the issue is Splash Academy didnt seem to have any specific times for events inside so it didn't encourage predictable turn over, but I guess having timed events would just increase disappointment when you didnt get in.\n\nWith so many kids on board, half the Karaoke songs in Cavern were little kids singing songs from movies! That was fun and cute. Little kids were even volunteering to tell jokes with the stand up comedian and half the quiz participants were kids (lucky for me because they couldn't answer trivia about the 90s or 00s.)\n\n",
    author: "DoomGoober",
    score: 1,
    upvote_ratio: 1,
    num_comments: 1,
    subreddit: "NCL",
    created_utc: "2025-12-02T15:26:48.000Z",
    url: "https://www.reddit.com/r/NCL/comments/1pcbb32/bliss_splash_academy_always_full/",
    flair: "Review",
    over_18: false,
    is_self: true,
    spoiler: false,
    locked: false,
    is_video: false,
    domain: "self.NCL",
    thumbnail: "self",
    url_overridden_by_dest: null,
    media: null,
    media_metadata: null,
    gallery_data: null,
  },
  {
    kind: "post",
    query: "cute",
    id: "1pcb9u7",
    title: "Me. Cute egg",
    body: "",
    author: "sweeteIyse",
    score: 2,
    upvote_ratio: 1,
    num_comments: 0,
    subreddit: "Pareidolia",
    created_utc: "2025-12-02T15:25:27.000Z",
    url: "https://www.reddit.com/r/Pareidolia/comments/1pcb9u7/me_cute_egg/",
    flair: null,
    over_18: false,
    is_self: false,
    spoiler: false,
    locked: false,
    is_video: false,
    domain: "i.redd.it",
    thumbnail:
    "https://b.thumbs.redditmedia.com/AdkosIqPNBTmlA9yp2yPnUZg7bOWzGfwqUkuG2LKATc.jpg",
    url_overridden_by_dest: "https://i.redd.it/k0enre9s6t4g1.jpeg",
    media: null,
    media_metadata: null,
    gallery_data: null,
  },
  {
    kind: "post",
    query: "cute",
    id: "1pcb970",
    title: "Now this is a rare dangerous cute penguin. 🐧",
    body: "",
    author: "Dragons_Potion",
    score: 1,
    upvote_ratio: 1,
    num_comments: 0,
    subreddit: "u_Dragons_Potion",
    created_utc: "2025-12-02T15:24:44.000Z",
    url: "https://www.reddit.com/r/u_Dragons_Potion/comments/1pcb970/now_this_is_a_rare_dangerous_cute_penguin/",
    flair: null,
    over_18: false,
    is_self: false,
    spoiler: false,
    locked: false,
    is_video: false,
    domain: "i.redd.it",
    thumbnail:
      "https://b.thumbs.redditmedia.com/Tlp4R6E4DHC-q3VhIg__hikNNjIBHW7ymJacyjYUnmU.jpg",
    url_overridden_by_dest: "https://i.redd.it/r8pkp3np0n4g1.jpeg",
    media: null,
    media_metadata: null,
    gallery_data: null,
  },
];

/**
 * Converts raw Reddit post data to Post model with all required fields.
 * Uses local cached images instead of external URLs to avoid network requests.
 */
export const mockPosts: Post[] = rawPosts.map((post) => ({
  id: post.id,
  communityId: post.subreddit,
  creatorId: post.author,
  creatorDisplayName: post.author,
  title: post.title,
  body: post.body ?? "",
  numberOfComments: post.num_comments,
  voteStatus: post.score,
  // Use local cached image placeholder instead of external URL
  imageURL: post.url_overridden_by_dest
    ? "/images/recCommsArt.png"
    : undefined,
  createdAt: post.created_utc,
  // Initialize new fields with default values
  score: post.score,
  userUpvote: false,
  userCommented: false,
}));
