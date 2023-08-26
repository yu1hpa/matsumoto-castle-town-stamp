import Image from "next/image";

async function getMemories() {
  const res = await fetch("http://localhost:8886/images", {
    method: "post",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch users");
  }
  //const data = await res.json();
  const data = res.json();
  console.log("data",data)
  return data
}

export default async function Home() {
  const data = await getMemories();
  console.log(data)
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center">
        <h1 className="text-4xl">みんなの思い出</h1>
        <p>dasdf</p>
        {data.map((d: any) => {
          {d}
          <Image src={`data:image/jpeg;base64,${d}`} style={{ width: '300px' }} alt="" />
        })}
     </div>
    </main>
  )
}
