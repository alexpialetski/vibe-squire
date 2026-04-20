type LoadingLineProps = {
  width?: string;
};

export function LoadingLine({ width = '100%' }: LoadingLineProps) {
  return <span className="ui-loading-line" style={{ width }} aria-hidden />;
}
