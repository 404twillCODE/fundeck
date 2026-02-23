import JoinClient from "@/app/join/[code]/JoinClient";

type JoinPageProps = {
  params: { code: string };
};

export default function JoinPage({ params }: JoinPageProps) {
  return <JoinClient code={params.code} />;
}
