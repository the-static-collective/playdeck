export const downloadJson = (
  name: string,
  value: unknown,
) => {
  const blob = new Blob(
    [JSON.stringify(value, null, 2) + "\n"],
    {type: "application/json"},
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};
