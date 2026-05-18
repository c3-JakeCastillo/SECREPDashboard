/*
 * Copyright 2009-2026 C3 AI (www.c3.ai). All Rights Reserved.
 * Confidential and Proprietary C3 Materials.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

import { useState } from "react";
import Header from "./components/shared/Header";
import IntegratedView from "./components/integrated/IntegratedView";
import IMAModule from "./components/ima/IMAModule";
import RIPModule from "./components/rip/RIPModule";
import type { ModuleView, TimeRange } from "./types";

if (import.meta.env.MODE === 'development') {
  const authToken = import.meta.env.VITE_C3_AUTH_TOKEN;
  if (authToken) document.cookie = `c3auth=${authToken}`;
}

export default function App() {
  const [moduleView, setModuleView] = useState<ModuleView>("integrated");
  const [timeRange, setTimeRange] = useState<TimeRange>("current_month");

  return (
    <div className="min-h-screen bg-canvas">
      <Header
        moduleView={moduleView}
        onModuleViewChange={setModuleView}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
      <main className="max-w-[1920px] mx-auto px-6 py-6">
        {moduleView === "integrated" && <IntegratedView timeRange={timeRange} />}
        {moduleView === "ima_only" && <IMAModule timeRange={timeRange} />}
        {moduleView === "rip_only" && <RIPModule timeRange={timeRange} />}
      </main>
    </div>
  );
}
