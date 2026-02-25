import JoinClient from "@/app/join/[code]/JoinClient";

type JoinPageProps = {
  params: Promise<{ code: string }>;
};

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;
  return <JoinClient code={code ?? ""} />;
}
