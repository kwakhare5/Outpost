"use client";

import React from "react";
import { SandboxModal } from "./SandboxModal";

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArchitectureModal({ isOpen, onClose }: ArchitectureModalProps) {
  return (
    <SandboxModal
      isOpen={isOpen}
      onClose={onClose}
      initialTab="architecture"
      onTriggerScenario={() => {}}
      onReset={() => {}}
    />
  );
}
