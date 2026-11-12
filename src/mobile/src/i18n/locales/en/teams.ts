/**
 * English `teams` namespace resources.
 *
 * Every value is the exact English source string used as the runtime
 * translation key, matching the source-keyed catalogue convention.
 */
export default {
    // Teams list
    teams: 'Teams',
    sharedSpacesSubtitle: 'Your shared financial spaces',
    yourSharedSpaces: 'Your Shared Spaces',
    tapTeamPrompt: 'Tap a team to open its workspace',
    planTrackTogether: 'Plan and track money together, privately.',
    myTeams: 'My Teams',
    noTeamsYet: 'No teams yet.',
    createTeamPrompt: 'Create a team to start planning shared finances.',
    openTeam: 'Open {{name}}',
    spentAmount: 'Spent {{amount}}',
    targetAmount: 'Target {{amount}}',
    spentLabel: 'Spent',
    targetLabel: 'Target',
    archived: 'Archived',
    archivedSubtitle: 'Archived teams keep their history',
    restoreTeam: 'Restore Team',
    privacyTitle: 'Your personal finances stay private',
    privacyText:
        'Only transactions deliberately assigned to a team are visible to its members.',
    createNewTeam: 'Create New Team',
    teamsPreviewNote:
        'Preview data only — team records are kept in memory and are not persisted.',

    // Create team
    createTeam: 'Create Team',
    createTeamSubtitle: 'Set up your shared space',
    stepOf: 'Step {{current}} of {{total}}',
    tellUsAboutTeam: 'Tell us about your team',
    teamName: 'Team name',
    teamNamePlaceholder: 'e.g. Our Family',
    teamType: 'Team type',
    teamTypePrompt:
        'Create a space for people you want to plan and track money with.',
    continue: 'Continue',
    manageMoneyQuestion: 'How will your team manage money?',
    financeModelPrompt: 'Choose the financial model that fits your team.',
    poolMoney: 'Pool money together',
    poolMoneyDescription:
        'Members contribute to shared funds. Plan, request, approve and record spending.',
    spendIndependently: 'Spend independently',
    spendIndependentlyDescription:
        'Everyone keeps their money and records purchases made for the team.',
    reviewYourTeam: 'Review your team',
    name: 'Name',
    type: 'Type',
    financeModel: 'Finance model',
    financeModelWarning:
        'Changing the finance model after transactions exist will require a controlled process.',
    previousStep: 'Previous Step',
    selected: 'Selected',
    chooseThisModel: 'Choose this model',

    // Invitation recipient
    teamInvitation: 'Team Invitation',
    reviewAndRespond: 'Review and respond',
    invitedTo: "You're invited to {{name}}",
    joinSharedWorkspace: 'Join a shared finance workspace on AuditWallet.',
    yourRole: 'Your role',
    acceptInvitation: 'Accept Invitation',
    decline: 'Decline',
    invitationDemoNote: 'Demonstration only; no membership changes are made.',

    // Workspace
    teamWorkspace: 'Team workspace',
    availableTeamFunds: 'Available team funds (tracked)',
    totalTeamSpendingMonth: 'Total team spending this month',
    teamFundAllocation: 'Team fund allocation',
    sharedSpendingTarget: 'Shared spending target',
    pooledTrackedNote: 'Tracked pool — AuditWallet does not hold funds.',
    independentTrackedNote:
        'Each member keeps their own money; totals are recorded purchases.',
    archivedTeamTitle: 'This team is archived',
    archivedTeamText:
        'Financial history is retained. Restore the team to resume working in it.',
    members: 'Members',
    peopleAndRoles: 'People & roles',
    teamChat: 'Team Chat',
    groupMessages: 'Group messages',
    teamFinanceTools: 'Team Finance Tools',
    teamFinanceToolsSubtitle: 'Custom tools to manage team finance',
    budgets: 'Budgets',
    savingsGoals: 'Savings Goals',
    insights: 'Insights',
    monthlyPlan: 'Monthly Plan',
    cashFlow: 'Cash Flow',
    plannedExpenses: 'Planned Expenses',
    sharedExpenses: 'Shared Expenses',
    activity: 'Activity',
    teamContributionsA11y: 'Team contributions',
    memberSpendingA11y: 'Member spending',
    contributions: 'Contributions',
    memberSpending: 'Member Spending',
    sharedInflowsByMember: 'Shared inflows by member',
    purchasesPaidByMember: 'Purchases paid by member',
    inviteTeamMember: 'Invite Team Member',
    teamSettings: 'Team Settings',
    personalFinanceLink: 'Personal finance link',
    pooledFinanceLinkText:
        'In production, contributions will be recorded as an outflow in your personal team category and a linked inflow in this team ledger. Later team spending is not counted again as your personal spend.',
    independentFinanceLinkText:
        "In production, your own team purchases will appear under your personal team category. Other members' purchases stay out of your personal spending.",
    categoryLinkingPending: 'Automatic category linking is not connected yet.',

    // Members
    teamMembers: 'Team Members',
    inviteMember: 'Invite Member',
    pendingInvitations: 'Pending Invitations',
    pendingInvitationsDemo: 'Demo only — nothing has been delivered',
    noPendingInvitations: 'No pending invitations.',
    pending: 'Pending',
    invitationPrivacyNote:
        'Production invitations will be validated server-side and will never reveal whether a phone number or email already has an account.',

    // Invite
    inviteSomeoneTo: 'Invite someone to {{name}}',
    inviteExistingPrompt: 'Invite an existing AuditWallet user or someone new.',
    contactMethod: 'Contact method',
    phoneNumber: 'Phone number',
    emailAddress: 'Email address',
    teamRole: 'Team role',
    inviteHint:
        'Recipients open the invite in AuditWallet, or install the app and sign up before accepting. No message is sent in this preview.',
    sendInvitation: 'Send Invitation',

    // Settings
    nameSettings: '{{name}} · settings',
    financeModelLocked:
        'The finance model cannot be changed after a team has financial history.',
    archivedTeamLabel: 'Archived team',
    restoreTeamText: 'Restoring makes the team active again. All history is kept.',
    archiveTeam: 'Archive Team',
    saveChanges: 'Save Changes',

    // Finance
    teamOnly: '{{name}} only',
    pooledFundAllocation: 'Pooled fund allocation',
    savedOfTarget: '{{saved}} of {{target}}',
    ofLabel: 'of',
    goalsIntentionsNote:
        'Team goals are tracked intentions. AuditWallet does not move or hold savings.',
    teamSpendingThisMonth: 'Team spending this month',
    insightsProductionNote:
        'Production insights will break down by category, period, and member using team-scoped records only.',
    teamAllocationMonth: 'Team allocation for the month',
    sharedTargetMonth: 'Shared spending target for the month',
    allocationsArePlans: 'Allocations are plans, not actual cash movement.',
    pooledCashFlowSubtitle: 'Recorded fund outflows and projected commitments',
    independentCashFlowSubtitle: 'Aggregate member spending activity',
    plannedCostsSeparate: 'Planned costs are shown separately from actual cash movement.',
    financePreviewNote:
        'Preview data — not connected to the backend. Team records are demo-only.',

    // Activity & breakdown
    teamActivity: 'Team Activity',
    auditHistoryFor: '{{name}} · audit history',
    noActivityYet: 'No activity yet.',
    activityProductionNote:
        'Production activity must come from server-side audit history, not client state.',
    teamContributions: 'Team Contributions',
    sharedInflowsFor: '{{name}} · shared inflows',
    purchasesPaidFor: '{{name}} · purchases paid by member',
    memberContributions: 'Member Contributions',
    spendingByMember: 'Spending by Member',
    pooledDemoAmounts: 'Pooled teams only · demo amounts',
    demoAmountsNoPool: 'Demo amounts · no pooled balance',
    contributionsInfoText:
        "Contributions are linked to a personal team category and appear as team inflows. Team spending is never double-counted in a contributor's personal ledger.",
    spendingInfoText:
        'Each member retains their own money. The team aggregates eligible purchases; there is no pooled balance or approval process.',

    // Chat
    teamChatTitle: '{{name}} Chat',
    noMessagesYet: 'No messages yet. Start the conversation.',
    messagePlaceholder: 'Message your team...',
    messageYourTeam: 'Message your team',
    sendMessage: 'Send message',
    chatPreviewNote: 'Preview chat — messages are not delivered or persisted.',

    // Shared expenses
    sharedExpensesFor: '{{name}} · recorded purchases',
    recordedByMembers: 'Recorded by team members',
    noTeamExpenses: 'No team expenses recorded yet.',
    paidBy: 'Paid by {{name}}',
    recordExpense: 'Record Expense',
    expensesProductionNote:
        'Production records will attach receipts and line items through the shared transaction flow.',
    recordTeamExpense: 'Record Team Expense',
    payerAttributedFor: '{{name}} · payer attributed',
    expenseDescription: 'Expense description',
    expenseDescriptionPlaceholder: 'e.g. Groceries',
    amount: 'Amount',
    dateFormat: 'Date (YYYY-MM-DD)',
    category: 'Category',
    paidByLabel: 'Paid by',
    receiptComponentsNote:
        'Receipt scanning and line items reuse the existing shared components.',
    saveTeamExpense: 'Save Team Expense',
    expenseDemoNote:
        'Demo only — the expense is stored in memory and is not sent to the backend.',

    // Planned expenses
    awaitingApproval: 'Awaiting Approval',
    needsReview: 'Needs review',
    approvedNotSpent: 'Approved, Not Spent',
    pendingCompletion: 'Pending completion',
    noMatchingRequests: 'No matching requests.',
    requestedBy: 'Requested by {{name}}',
    requestPlannedExpense: 'Request Planned Expense',
    approvalNotPayment: 'Approval is not payment',
    approvalInfoText:
        'Approved requests remain planned until the requester confirms actual expenditure. Only completion creates a recorded expense.',
    upcomingPlannedPurchases: 'Upcoming Planned Purchases',
    noApprovalRequired: 'No approval required',
    noApprovalInfoText:
        'Members may plan purchases or record expenses directly. Planned amounts are not money already spent.',
    plannedPreviewNote:
        'Preview data only — requests and planned purchases are not persisted.',

    // Requests
    newExpenseRequest: 'New Expense Request',
    pooledFor: '{{name}} · pooled',
    purchaseQuestion: 'What do you need to purchase?',
    purchasePlaceholder: 'e.g. Washing Machine',
    descriptionOptional: 'Description (optional)',
    descriptionPlaceholder: 'Why is this needed?',
    estimatedAmount: 'Estimated amount',
    plannedDateOptional: 'Planned date (optional)',
    submitDoesNotSpend: 'Submitting a request does not spend team money.',
    submitForApproval: 'Submit for Approval',
    expenseRequest: 'Expense Request',
    requestedByLabel: 'Requested by',
    estimatedCost: 'Estimated cost',
    approverNote: 'An authorized approver can approve or reject this request.',
    approve: 'Approve',
    reject: 'Reject',
    approvedNoDeduction: 'Approved; no team money has been deducted.',
    actualAmountSpent: 'Actual amount spent',
    actualAmount: 'Actual amount',
    markAsCompleted: 'Mark as Completed',
    completionProductionNote:
        'Production: requester or an explicitly authorized delegate only. Attach a receipt through the shared expense flow.',
    recordedExpenditure: 'Recorded expenditure',
    keptInHistory: 'Kept in history without recording any expenditure.',
    approvalNotPaymentText:
        'Approval is not payment. Only completion creates or links an actual team expense, exactly once.',

    // System labels
    pooledFunds: 'Pooled Funds',
    independentSpending: 'Independent Spending',
    pooled: 'Pooled',
    independent: 'Independent',
    family: 'Family',
    couple: 'Couple',
    travel: 'Travel',
    other: 'Other',
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
    phone: 'Phone',
    email: 'Email',
    all: 'All',
    approved: 'Approved',
    completed: 'Completed',
    rejected: 'Rejected',
    canceled: 'Canceled',

    // Route fallbacks
    team: 'Team',
    invitationNotFound: 'Invitation not found',
    auditHistory: 'Audit history',
    sharedInflows: 'Shared inflows',
    purchasesByMember: 'Purchases by member',
    inviteSomeoneToYourTeam: 'Invite someone to your team',
    settings: 'Settings',
    teamNotFound: 'Team not found.',
    recordedTeamPurchases: 'Recorded team purchases',
    teamScopedPurchase: 'Team-scoped purchase',
    teamFinance: 'Team Finance',
    teamScopedTools: 'Team-scoped tools',
    teamKindSubtitle: '{{name}} · {{kind}}',
    teamPlannedExpenses: 'Team planned expenses',
    pooledPlannedExpense: 'Pooled planned expense',
    requestDetails: 'Request details',
    requestNotFound: 'Request not found',

    // Teams premium feature catalog copy
    betterFinancesTogether: 'Better finances, together.',
    createSharedSpaceDescription:
        'Create a shared space to plan, track and understand money together.',
    managePooledOrIndependent: 'Manage pooled or independent team finances',
    trackContributionsSpending: 'Track contributions and shared spending',
    coordinateBudgetsGoals: 'Coordinate budgets, goals and expenses',
    bringYourPeopleIn: 'Bring your people in.',
    invitePeopleDescription:
        'Invite the people you trust into a shared financial space.',
    inviteMembersByEmail: 'Invite members by email',
    assignMemberRoles: 'Assign member roles',
    keepSharedMoneyVisible: 'Keep shared money visible to the right people',
    seeEveryContribution: 'See every contribution.',
    trackContributionsOutstanding:
        'Track who has contributed and what is still outstanding.',
    followPooledContributions: 'Follow pooled contributions',
    understandSharedSpending: 'Understand shared spending',
    stayAlignedAsTeam: 'Stay aligned as a team',
    organizeSharedFinances:
        'Organize shared finances with the people who matter.',
    keepEveryoneOnSamePage: 'Keep everyone on the same page',
    understandSharedExpenses: 'Understand shared expenses',
    planTogetherConfidence: 'Plan together with confidence',
} as const;
