import React, { useState, useEffect, useCallback, useContext } from "react";
import { View, Flex, Checkbox, AlertDialog, DialogTrigger, Button } from "@adobe/react-spectrum";
import { Component, GraphConfig, Team, Session } from "../../../types/datamodel";
import ChatView from "../../playground/chat/chat";
import { appContext } from "../../../../hooks/provider";
import { sessionAPI } from "../../playground/api";
import { teamAPI, graphAPI } from "../api";

interface TestDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  component: Component<GraphConfig>;
  graphId?: number;
}

const TestDrawer: React.FC<TestDrawerProps> = ({
  isVisible,
  onClose,
  component,
  graphId,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteOnClose, setDeleteOnClose] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { user } = useContext(appContext);

  // Create a session directly with graph component
  const createSessionForGraph = useCallback(async () => {
    if (!user?.id || !component) return;

    try {
      setLoading(true);
      
      // If we have a saved graph ID, use it. Otherwise, save the graph first
      let actualGraphId = graphId;
      
      if (!actualGraphId) {
        // Save the graph component temporarily
        const savedGraph = await graphAPI.createGraph({
          component: component,
          user_id: user.id,
        }, user.id);
        actualGraphId = savedGraph.id;
      }

      // Create session with the graph ID
      const defaultName = `Test Graph ${component.label || "Untitled"} - ${new Date().toLocaleString()}`;
      const createdSession = await sessionAPI.createSession(
        {
          name: defaultName,
          graph_id: actualGraphId,
          user_id: user.id,
        },
        user.id
      );
      setSession(createdSession);
    } catch (error) {
      console.error("Error creating session for graph:", error);
      setErrorMessage("Failed to create test environment");
    } finally {
      setLoading(false);
    }
  }, [user?.id, component, graphId]);

  // Cleanup session
  const cleanup = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Delete session
      if (session?.id) {
        await sessionAPI.deleteSession(session.id, user.id);
      }
      
      // If we created a temporary graph (no graphId prop), delete it
      if (!graphId && session?.graph_id) {
        await graphAPI.deleteGraph(session.graph_id, user.id);
      }
      
      setSession(null);
    } catch (error) {
      console.error("Error cleaning up test resources:", error);
      setErrorMessage("Error cleaning up test resources");
    }
  }, [session?.id, session?.graph_id, user?.id, graphId]);

  // Setup session when component becomes visible
  useEffect(() => {
    if (isVisible && component && !session) {
      createSessionForGraph();
    }
  }, [isVisible, component, session, createSessionForGraph]);

  // Handle close
  const handleClose = async () => {
    if (deleteOnClose) {
      await cleanup();
    }
    onClose();
  };

  return (
    <View UNSAFE_style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Error handling */}
      {errorMessage && (
        <DialogTrigger isOpen={!!errorMessage}>
          <Button variant="negative" isHidden>Error</Button>
          <AlertDialog 
            title="Error"
            variant="error"
            primaryActionLabel="OK"
            onPrimaryAction={() => setErrorMessage(null)}
          >
            {errorMessage}
          </AlertDialog>
        </DialogTrigger>
      )}

      {/* Title and controls */}
      <View UNSAFE_style={{ flexShrink: 0, marginBottom: '16px' }}>
        <Flex direction="column" gap="size-150">
          <View UNSAFE_className="text-lg font-semibold">
            Test Graph: {component?.label || "Untitled Graph"}
          </View>
          
          <Checkbox
            isSelected={deleteOnClose}
            onChange={setDeleteOnClose}
          >
            Delete session on close
          </Checkbox>
        </Flex>
      </View>

      {/* Content */}
      <View UNSAFE_style={{ flex: 1, minHeight: 0 }}>
        {loading && (
          <View UNSAFE_style={{ padding: '24px' }}>
            <p>Creating a test session...</p>
          </View>
        )}
        {session && <ChatView session={session} showCompareButton={false} />}
      </View>
    </View>
  );
};

export default TestDrawer; 