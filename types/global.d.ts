declare global {
  function formatTime(
    input: Date | number | string,
    opts?: Intl.DateTimeFormatOptions & { locale?: string }
  ): string;
}
export {};
