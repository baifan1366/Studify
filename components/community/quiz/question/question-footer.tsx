export default function QuestionFooter({
  explanation,
}: {
  explanation: string;
}) {
  return (
    <div className="bg-muted rounded-lg p-4 mb-6">
      <h2 className="text-sm font-semibold mb-2">Explanation</h2>
      <p className="text-sm text-muted-foreground">{explanation}</p>
    </div>
  );
}
