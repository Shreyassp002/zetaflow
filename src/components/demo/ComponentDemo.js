import { AppLayout, Header, Container } from "../layout";
import { Button, ActionButton, StatusIndicator, StatusBadge } from "../ui";

/**
 * Demo component to showcase the implemented UI components
 */
export default function ComponentDemo() {
  const handleNetworkToggle = () => {
    console.log("Network toggle clicked");
  };

  return (
    <AppLayout>
      <Header
        networkMode="testnet"
        onNetworkToggle={handleNetworkToggle}
        connectedWallet="0x1234567890abcdef1234567890abcdef12345678"
      />

      <main className="flex-1 py-8">
        <Container>
          <div className="space-y-8">
            {/* Page Title */}
            <div>
              <h1 className="text-3xl font-bold text-black mb-2">
                Component Demo
              </h1>
              <p className="text-gray-600">
                Showcasing the clean black and white UI components
              </p>
            </div>

            {/* Button Variants */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-black">
                Button Components
              </h2>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Primary Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="success">Success Button</Button>
                  <Button variant="outline">Outline Button</Button>
                  <Button variant="ghost">Ghost Button</Button>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button size="sm">Small Button</Button>
                  <Button size="md">Medium Button</Button>
                  <Button size="lg">Large Button</Button>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button disabled>Disabled Button</Button>
                </div>
              </div>
            </section>

            {/* Action Button Variants */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-black">
                Action Buttons
              </h2>

              <div className="flex flex-wrap gap-4">
                <ActionButton color="default">Default Action</ActionButton>
                <ActionButton color="blue">Blue Action</ActionButton>
                <ActionButton color="green">Green Action</ActionButton>
              </div>
            </section>

            {/* Status Indicators */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-black">
                Status Indicators
              </h2>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <StatusIndicator status="success" />
                  <StatusIndicator status="pending" />
                  <StatusIndicator status="failed" />
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                  <StatusIndicator status="success" showText />
                  <StatusIndicator status="pending" showText />
                  <StatusIndicator status="failed" showText />
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                  <StatusIndicator status="success" size="sm" showText />
                  <StatusIndicator status="pending" size="md" showText />
                  <StatusIndicator status="failed" size="lg" showText />
                </div>
              </div>
            </section>

            {/* Status Badges */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-black">
                Status Badges
              </h2>

              <div className="flex flex-wrap gap-4">
                <StatusBadge status="success" />
                <StatusBadge status="pending" />
                <StatusBadge status="failed" />
              </div>

              <div className="flex flex-wrap gap-4">
                <StatusBadge status="success" text="Transaction Complete" />
                <StatusBadge status="pending" text="Processing..." />
                <StatusBadge status="failed" text="Transaction Failed" />
              </div>
            </section>

            {/* Interactive Demo */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-black">
                Interactive Demo
              </h2>

              <div className="border border-gray-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIndicator status="success" />
                    <span className="text-sm text-gray-600">
                      Transaction Status
                    </span>
                  </div>
                  <StatusBadge status="success" text="Confirmed" />
                </div>

                <div className="flex gap-2">
                  <ActionButton color="blue" size="sm">
                    View Details
                  </ActionButton>
                  <ActionButton color="green" size="sm">
                    Export
                  </ActionButton>
                  <Button variant="outline" size="sm">
                    Share
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </Container>
      </main>
    </AppLayout>
  );
}
