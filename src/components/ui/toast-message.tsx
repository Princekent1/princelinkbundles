type ToastMessageProps = {
  title: string;
  description?: string;
};

export const ToastMessage = ({ title, description }: ToastMessageProps) => {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-sm font-semibold leading-snug">{title}</p>
      {description && (
        <p className="text-sm opacity-80 leading-snug">{description}</p>
      )}
    </div>
  );
};
