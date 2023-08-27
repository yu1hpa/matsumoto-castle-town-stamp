import Image from "next/image";

type Contents = {
  images: Content[];
}

type Content = {
  Key: string;
  LastModified: string;
  ETag: string;
  Size: string;
  StorageClass: string;
}

const SERVER_URL = process.env.SERVER_URL ?? "";

async function getMemories() {
  const res = await fetch(`${SERVER_URL}/images`, {
    method: "post",
  });

  if (!res.ok) {
    throw new Error("[-] Failed to fetch images");
  }
  const data = res.json();
  console.log("data",data)
  return data
}

async function getMemoriesImage(key: string) {
  const res = await fetch(`${SERVER_URL}/images/${key}`);
  if (!res.ok) {
    throw new Error("[-] Failed to fetch image")
  }
}

export default async function Home() {
  const data: Contents = await getMemories();
  console.log(data.images)
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center">
        <h1 className="text-4xl">みんなの思い出</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.images.map((d: Content) => 
          <div className="w-full h-full aspect-w-1 aspect-h-1" key={d.Key}>
            <Image
              key={d.Key}
              src={`${SERVER_URL}/images/${d.Key}`}
              alt=""
              style={{ position: "relative", width: "300px", height: "300px" }}
              width="200"
              height="200"
            />
          </div>
        )}
        </div>
    </div>
    </main>
  )
}
