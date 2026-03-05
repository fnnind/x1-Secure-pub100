import CreateSubXeuronButton from "@/components/header/CreateSubXeuronButton";
import CreatePostForm from "@/components/post/CreatePostForm";
import { SubxeuronCombobox } from "@/components/subxeuron/SubxeuronCombobox";
import { getSubxeurons } from "@/lib/supabase/subxeurons";

async function CreatePostPage({
  searchParams,
}: {
  searchParams: Promise<{ subxeuron?: string; publication?: string; event?: string }>
}) {
  const { subxeuron, publication, event } = await searchParams;

  // Build context label for the banner
  let contextLabel: string | null = null;
  let contextDescription: string | null = null;

  if (subxeuron) {
    contextLabel = subxeuron;
    contextDescription = `Create a post in the ${subxeuron} subXeuron`;
  } else if (publication) {
    contextLabel = publication;
    contextDescription = `Create a discussion post for publication: ${publication}`;
  } else if (event) {
    contextLabel = event;
    contextDescription = `Create a discussion post for this event`;
  }

  if (contextLabel) {
    return (
      <>
        <section className="bg-white border-b">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div>
              <h1 className="text-2xl font-bold">Create Post</h1>
              <p className="text-sm text-gray-600">{contextDescription}</p>
            </div>
          </div>
        </section>

        <section className="my-8">
          <CreatePostForm />
        </section>
      </>
    );
  }

  // No context: show subxeuron selector
  const subxeurons = await getSubxeurons();

  return (
    <>
      <section className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div>
            <h1 className="text-2xl font-bold">Create Post</h1>
            <p className="text-sm text-gray-600">
              Select a subXeuron for your post
            </p>
          </div>
        </div>
      </section>

      <section className="my-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col gap-4">
            <div className="max-w-3xl">
              <label className="block text-sm font-medium mb-2">
                Select a subXeuron to post in
              </label>
              <SubxeuronCombobox
                subxeurons={subxeurons}
                defaultValue={subxeuron}
              />

              <hr className="my-4" />

              <p className="mt-4 text-sm text-gray-600">
                If you don&apos;t see your subXeuron, you can create it here.
              </p>
              <div className="mt-2">
                <CreateSubXeuronButton />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default CreatePostPage;
