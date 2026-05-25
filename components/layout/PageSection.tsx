import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function PageSection({
  title,
  description,
  action,
  children,
  className,
}: Props) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-section-title">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-caption">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
