import React from "react";
import { Button, Drawer } from "antd";
import { ComponentTestResult } from "../../api";

interface TestDetailsProps {
  result: ComponentTestResult;
  onClose: () => void;
}

const TestDetails: React.FC<TestDetailsProps> = ({ result, onClose }) => {
  return (
    <Drawer
      title="Test Results"
      placement="right"
      width={640}
      onClose={onClose}
      open={true}
      footer={
        <div style={{ textAlign: "right" }}>
          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          className={`p-4 rounded-lg ${
            result.status
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <h3
            className={`font-medium ${
              result.status ? "text-green-900" : "text-red-900"
            }`}
          >
            Status: {result.status ? "Success" : "Failed"}
          </h3>
          {result.message && (
            <p
              className={`mt-2 ${
                result.status ? "text-green-700" : "text-red-700"
              }`}
            >
              {result.message}
            </p>
          )}
        </div>

        {result.logs && result.logs.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Logs:</h3>
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {result.logs.join("\n")}
              </pre>
            </div>
          </div>
        )}

        {result.data && (
          <div>
            <h3 className="font-medium mb-2">Additional Data:</h3>
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-700">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default TestDetails; 