import React from "react";
import MessagePanel, { MessageItem } from "./MessagePanel";

const SEED_DMS: MessageItem[] = [
  { id:"d1", name:"Bria Patterson",  subtitleTop:"Happy Friday team!!!",             subtitleBottom:"Thanks for all You...", rightStatus:"dot" },
  { id:"d2", name:"Robert Mccloud",  subtitleTop:"Therapy ready. Full care team.",   subtitleBottom:"Thanks for all You...", rightStatus:"none" },
  { id:"d3", name:"Rhonda Fairley",  subtitleTop:"Wound care ongoing. SN only.",     subtitleBottom:"Thanks for all You...", rightStatus:"none" },
  { id:"d4", name:"Emma McElroy",    subtitleTop:"Auth hold. No new updates.",       subtitleBottom:"Thanks for all You...", rightStatus:"none" },
  { id:"d5", name:"Adrian Foster",   subtitleTop:"Vitals improved after visit.",      subtitleBottom:"Thanks for all You...", rightStatus:"none" },
  { id:"d6", name:"Lana Jenkins",    subtitleTop:"Medication adjusted today.",        subtitleBottom:"Thanks for all You...", rightStatus:"ok" },
];

export type DirectMessagesProps = {
  items?: MessageItem[];
  onNew?: () => void;
};

export default function DirectMessages({ items = SEED_DMS, onNew }: DirectMessagesProps) {
  return (
    <MessagePanel
      title="Direct Messages"
      newLabel="New Messages"
      items={items}
      onNew={onNew}
    />
  );
}
