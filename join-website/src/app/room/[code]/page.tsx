import RoomClient from "@/app/room/[code]/RoomClient";

type RoomPageProps = {
  params: Promise<{ code: string }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params;
  return <RoomClient code={code ?? ""} />;
}
