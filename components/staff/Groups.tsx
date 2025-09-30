import React from "react";
import MessagePanel, { MessageItem } from "./MessagePanel";

const SEED_GROUPS: MessageItem[] = [
  { id:"g1", name:"Christine Mccloud", subtitleTop:"Vitals stable. All services active.", subtitleBottom:"Dr. Isaac – Medicare Plus Blue", rightStatus:"dot" },
  { id:"g2", name:"Robert Mccloud",   subtitleTop:"Therapy ready. Full care team.",      subtitleBottom:"Dr. Parker – MPB PPO",      rightStatus:"none" },
  { id:"g3", name:"Rhonda Fairley",   subtitleTop:"Wound care ongoing. SN only.",        subtitleBottom:"Dr. Packey – MCARE ADV",     rightStatus:"dot" },
  { id:"g4", name:"Emma McElroy",     subtitleTop:"Auth hold. No new updates.",          subtitleBottom:"Dr. Palfy – Wellcare HMO",   rightStatus:"none" },
  { id:"g5", name:"Adrian Foster",    subtitleTop:"Vitals improved after visit.",        subtitleBottom:"Dr. Moore – United HealthCare", rightStatus:"none" },
  { id:"g6", name:"Lana Jenkins",     subtitleTop:"Medication adjusted today.",          subtitleBottom:"Dr. Patel – Aetna Gold Plan", rightStatus:"ok" },
];

export type GroupsProps = {
  items?: MessageItem[];
  onNew?: () => void;
};

export default function Groups({ items = SEED_GROUPS, onNew }: GroupsProps) {
  return (
    <MessagePanel
      title="Internal Groups"
      newLabel="New Internal Group"
      items={items}
      onNew={onNew}
    />
  );
}
