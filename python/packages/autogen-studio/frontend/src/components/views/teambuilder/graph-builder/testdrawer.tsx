import React, { useState, useEffect, useCallback, useContext } from "react";
import { View, Flex, Checkbox, AlertDialog, DialogTrigger, Button } from "@adobe/react-spectrum";
import { Component, GraphConfig, Team, Session } from "../../../types/datamodel";
import ChatView from "../../playground/chat/chat";
import { appContext } from "../../../../hooks/provider";
import { sessionAPI } from "../../playground/api";
import { teamAPI } from "../api";

interface TestDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  component: Component<GraphConfig>;
}

const TestDrawer: React.FC<TestDrawerProps> = ({
  isVisible,
  onClose,
  component,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [tempTeam, setTempTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteOnClose, setDeleteOnClose] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { user } = useContext(appContext);

  // Create a temporary team wrapper around the graph for testing
  const createTempTeamAndSession = useCallback(async () => {
    if (!user?.id || !component) return;

    try {
      setLoading(true);
      
      // Create a team wrapper around the graph component
      const teamWrapper: Partial<Team> = {
        component: {
          provider: "autogen_agentchat.teams.RoundRobinGroupChat", // Use a simple team wrapper
          component_type: "team",
          version: 1,
          component_version: 1,
          description: "Temporary team wrapper for graph testing",
          label: `Test Wrapper for ${component.label || "Graph"}`,
          config: {
            participants: component.config.participants || [],
            termination_condition: component.config.termination_condition,
            max_turns: component.config.max_turns,
          },
        },
        user_id: user.id,
      };

      const savedTeam = await teamAPI.createTeam(teamWrapper, user.id);
      setTempTeam(savedTeam);

      // Create session with the temporary team
      const defaultName = `Test Graph ${component.label || "Untitled"} - ${new Date().toLocaleString()}`;
      const createdSession = await sessionAPI.createSession(
        {
          name: defaultName,
          team_id: savedTeam.id,
        },
        user.id
      );
      setSession(createdSession);
    } catch (error) {
      console.error("Error creating temporary team and session:", error);
      setErrorMessage("Failed to create test environment");
    } finally {
      setLoading(false);
    }
  }, [user?.id, component]);

  // Cleanup temp team and session
  const cleanup = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Delete session first
      if (session?.id) {
        await sessionAPI.deleteSession(session.id, user.id);
      }
      
      // Then delete temporary team
      if (tempTeam?.id) {
        await teamAPI.deleteTeam(tempTeam.id, user.id);
      }
      
      setSession(null);
      setTempTeam(null);
    } catch (error) {
      console.error("Error cleaning up test resources:", error);
      setErrorMessage("Error cleaning up test resources");
    }
  }, [session?.id, tempTeam?.id, user?.id]);

  // Setup temp team and session when component becomes visible
  useEffect(() => {
    if (isVisible && component && !session && !tempTeam) {
      createTempTeamAndSession();
    }
  }, [isVisible, component, session, tempTeam, createTempTeamAndSession]);

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