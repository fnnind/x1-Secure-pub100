'use client'

import { useUser } from "@/lib/supabase/auth-context";
import { usePathname, useRouter } from "next/navigation"
import { Button } from "../ui/button";
import { Plus } from "lucide-react";

function CreatePost() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  // If you write `const { user } = useUser() to access the value directly as `user`
  // `const user = useUser();` need to access via `user.user` or `user.isSignedIn`

  const handleCreatePost = () => {
    // Extract subXeuron name
    const subXeuronName = pathname.includes("/x/")
      ? pathname.split("/x/")[1]
      : null;

    // if we're in a subXeuron, redirect to create post with that subXeuron pre-selected
    if (subXeuronName) {
      router.push(`/create-post?subxeuron=${subXeuronName}`);
    } else {
      router.push("/create-post")
    }
  };

  return (
    <Button onClick={handleCreatePost} disabled={!user}>
      <Plus className="w-2 h-2" />
      {user ? "Create Post" : "sign in to post"}
    </Button>
  );
}

export default CreatePost