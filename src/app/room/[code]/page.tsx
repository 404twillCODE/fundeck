import RoomClient from "@/app/room/[code]/RoomClient";

type RoomPageProps = {
  params: { code: string };
};

export default function RoomPage({ params }: RoomPageProps) {
  return <RoomClient code={params.code} />;
}
