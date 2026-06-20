import type { SVGProps } from "react";

/**
 * Locally drawn civic SVG icons for ClearLane (no government marks, no
 * hotlinked assets). Stroke-based, 24x24, inherit `currentColor` — they sit
 * alongside lucide-react icons used elsewhere.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function TrafficPoliceIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="6" r="2.4" />
      <path d="M7 10.5h10l-.6 3H7.6z" />
      <path d="M8 13.5V21M16 13.5V21" />
      <path d="M9.5 11.5 4 8M14.5 11.5 20 14.5" />
    </Base>
  );
}

export function JunctionIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3v18M3 12h18" />
      <path d="M9 3h6M9 21h6M3 9v6M21 9v6" />
      <circle cx="12" cy="12" r="1.4" />
    </Base>
  );
}

export function NoParkingIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 16V8h3.5a2.5 2.5 0 0 1 0 5H9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </Base>
  );
}

export function TowVehicleIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2 16V11h8l3 3h5a2 2 0 0 1 2 2v0" />
      <path d="M2 16h2M16 16h-3" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="18" cy="18" r="1.8" />
      <path d="M10 11 14 6h3" />
    </Base>
  );
}

export function PatrolUnitIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="5.5" cy="17" r="2.5" />
      <circle cx="18.5" cy="17" r="2.5" />
      <path d="M8 17h6l3-5h-4l-2-3H8" />
      <path d="M14 12 12 7M16 7h-4" />
    </Base>
  );
}

export function TrafficSignalIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="8.5" y="2.5" width="7" height="15" rx="2.2" />
      <circle cx="12" cy="6" r="1.1" />
      <circle cx="12" cy="10" r="1.1" />
      <circle cx="12" cy="14" r="1.1" />
      <path d="M12 17.5V21M9 21h6" />
    </Base>
  );
}

export function CctvIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 7.5 17 4l1 3.5L4 11z" />
      <path d="M4 11v3M8 21a4 4 0 0 0 4-4" />
      <path d="M18 7.5 21 9" />
      <circle cx="6.5" cy="9" r="0.6" />
    </Base>
  );
}

export function BarricadeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="8" width="18" height="6" rx="1" />
      <path d="M6 8 3 5M18 8l3-3M6 14v5M18 14v5" />
      <path d="m7 8 4 6M13 8l4 6" />
    </Base>
  );
}

export function RoadClosureIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 21 8 5h8l3 16" />
      <path d="M10 9h4M9 13h6" />
      <path d="m3 4 18 16" opacity={0.9} />
    </Base>
  );
}

export function ControlRoomIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2.5" y="4" width="19" height="12" rx="2" />
      <path d="M7 20h10M9 16v4M15 16v4" />
      <path d="M6 8h4M6 11h3M14 7.5l2.4 2.4L20 6.5" />
    </Base>
  );
}

export function ZebraCrossingIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 5 7 19M9 5l2 14M14 5l1.5 14M19 5l1 14" />
    </Base>
  );
}

export const CIVIC_ICONS = {
  trafficPolice: TrafficPoliceIcon,
  junction: JunctionIcon,
  noParking: NoParkingIcon,
  towVehicle: TowVehicleIcon,
  patrolUnit: PatrolUnitIcon,
  trafficSignal: TrafficSignalIcon,
  cctv: CctvIcon,
  barricade: BarricadeIcon,
  roadClosure: RoadClosureIcon,
  controlRoom: ControlRoomIcon,
  zebra: ZebraCrossingIcon,
} as const;
