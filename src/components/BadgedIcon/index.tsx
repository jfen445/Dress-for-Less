import { Badge } from "@material-tailwind/react";

interface BadgedIconProps {
  icon: React.ReactNode;
  count: number;
  className?: string;
}

const BadgedIcon = ({ icon, count, className }: BadgedIconProps) => (
  <Badge
    content={count}
    placement="top-end"
    className="bg-secondary-pink text-white text-[8px] px-1 py-0.5 rounded"
  >
    <span className={className}>{icon}</span>
  </Badge>
);

export default BadgedIcon;
