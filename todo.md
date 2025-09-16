# 3-Column Layout Restructuring Todo

## Current Status: Planning Complete ✅

## Implementation Checklist

### Phase 1: Layout Foundation

- [ ] **Phase 1.1**: Update VrpLayout for 3-Column Support
  - [ ] Add centerPanel prop to VrpLayoutProps interface
  - [ ] Update ResizablePanelGroup to support 3 panels
  - [ ] Set default sizes: 35% | 40% | 25%
  - [ ] Set minimum sizes: 25% | 30% | 20%
  - [ ] Add proper ResizableHandle between panels
  - [ ] Update mobile layout with third "AI Chat" tab
  - [ ] Test responsive behavior and accessibility

- [ ] **Phase 1.2**: Update VrpExplorer for 3-Column Layout
  - [ ] Modify VrpLayout usage to include centerPanel
  - [ ] Move VrpMap from rightPanel to centerPanel
  - [ ] Add VrpAssistantPane as rightPanel (temporary)
  - [ ] Remove VrpAssistantButton integration from JSON editor
  - [ ] Ensure all existing props pass correctly
  - [ ] Test layout and functionality preservation

### Phase 2: Provider Restructuring

- [ ] **Phase 2.1**: Move VrpAssistantProvider to App Level
  - [ ] Update app/page.tsx to wrap VrpExplorer
  - [ ] Remove VrpAssistantProvider from VrpJsonEditor
  - [ ] Update any affected imports and context usage
  - [ ] Test VRP assistant state and data flow

- [ ] **Phase 2.2**: Update VRP Data Integration
  - [ ] Ensure VRP data sharing with top-level provider
  - [ ] Update setOnVrpDataUpdate callback mechanism
  - [ ] Verify AI assistant → JSON editor update flow
  - [ ] Test no regression in VRP modification features

### Phase 3: Chat Component Integration

- [ ] **Phase 3.1**: Create Enhanced VRP Chat Panel
  - [ ] Create VrpChatPanel.tsx component
  - [ ] Integrate with shadcn/ui Chat components
  - [ ] Add VRP AI Assistant header with status
  - [ ] Support message streaming and loading states
  - [ ] Include VRP-specific suggestion prompts
  - [ ] Add proper error handling and accessibility
  - [ ] Remove toggle/overlay behavior

- [ ] **Phase 3.2**: Add VRP-Specific Chat Features
  - [ ] Add VRP suggestion prompts ("Add vehicle", "Optimize routes", etc.)
  - [ ] Implement message formatting for VRP changes
  - [ ] Add change summary displays
  - [ ] Include copy functionality for responses
  - [ ] Add loading indicators during OpenAI processing
  - [ ] Style to match application theme

- [ ] **Phase 3.3**: Integrate New Chat Panel into Layout
  - [ ] Replace VrpAssistantPane with VrpChatPanel in VrpExplorer
  - [ ] Update imports (remove VrpAssistantPane, add VrpChatPanel)
  - [ ] Verify all VRP assistant functionality
  - [ ] Test message persistence and data updates

### Phase 4: Remove Toggle Logic

- [ ] **Phase 4.1**: Remove VRP Assistant Toggle Button
  - [ ] Remove VrpAssistantButton imports from VrpJsonEditor
  - [ ] Remove isOpen state and toggle logic from VrpAssistantContext
  - [ ] Update VrpAssistantContext interface (remove togglePane, isOpen)
  - [ ] Remove conditional rendering based on isOpen
  - [ ] Update TypeScript interfaces

- [ ] **Phase 4.2**: Clean Up Unused Components
  - [ ] Remove/deprecate VrpAssistantButton.tsx
  - [ ] Remove/deprecate VrpAssistantPane.tsx
  - [ ] Remove ShadcnChatInterface.tsx if unused
  - [ ] Update remaining imports and references
  - [ ] Clean up unused props/state in VrpAssistantContext
  - [ ] Update tests for always-visible architecture

## Quality Gates

Each phase must pass these criteria:
- ✅ All existing functionality preserved
- ✅ TypeScript compilation clean
- ✅ ESLint compliance
- ✅ Manual testing verification
- ✅ No regressions in VRP solving or map features
- ✅ Performance benchmarks met

## Success Metrics

1. **3-Column Layout**: JSON Editor (35%) | Map (40%) | AI Chat (25%)
2. **Always Visible AI**: Chat panel permanently accessible
3. **Enhanced UX**: Better shadcn/ui chat interface
4. **Mobile Support**: Proper 3-tab mobile experience
5. **No Regressions**: All existing features work
6. **Performance**: No degradation in load times or responsiveness

## Dependencies

- Existing VrpLayout ResizablePanel system
- VrpAssistantProvider and context integration
- Shadcn/ui Chat components
- VRP data modification pipeline
- OpenAI integration

## Risk Mitigation

- **Incremental Changes**: Small steps with testing after each
- **Preserve State**: Maintain VRP data and validation systems
- **Component Isolation**: Test each component independently
- **Rollback Plan**: Keep old components until new ones proven

---

**Next Action**: Begin Phase 1.1 - Update VrpLayout for 3-Column Support