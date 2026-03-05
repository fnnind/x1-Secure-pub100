import { getUser } from "@/lib/supabase/user";
import { getPosts } from "@/lib/supabase/posts";
import Post from "./Post";

async function PostsList() {
  const posts = await getPosts();
  const user = await getUser();
  const userId = "error" in user ? null : user._id;

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Post key={post._id} post={post} userId={userId} />
      ))}
    </div>
  );
}

export default PostsList