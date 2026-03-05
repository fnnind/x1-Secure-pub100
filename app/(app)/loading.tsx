import { Loader2 } from "lucide-react";

function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen -mt-20">
      <Loader2 className="w-20 h-20 text-red-700 animate-spin" />
    </div>
  );

}

export default Loading;