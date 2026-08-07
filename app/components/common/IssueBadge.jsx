export default function IssueBadge({ issue }) {
  if (!issue) {
    return null;
  }

  const severity = issue.severity || "medium";

  return (
    <span
      className={`tp-issue-badge tp-issue-badge--${severity}`}
    >
      {issue.label || "Unknown issue"}
    </span>
  );
}